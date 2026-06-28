import path from "node:path";
import { DiffResult, Risk, ServerSnapshot } from "../types.js";

const sensitiveName = /(token|secret|password|passwd|api[_-]?key|auth|authorization|credential|private[_-]?key)/i;
const remoteScript = /\b(curl|wget)\b[\s\S]*\|[\s\S]*\b(sh|bash)\b/i;

function commandText(server: ServerSnapshot): string {
  return [server.command, ...server.args].filter(Boolean).join(" ");
}

function risk(server: ServerSnapshot, ruleId: string, level: Risk["level"], reason: string, recommendation: string): Risk {
  return { client: server.client, serverName: server.name, ruleId, level, reason, recommendation };
}

function addedOrModifiedServers(diff: DiffResult): ServerSnapshot[] {
  return diff.changes.flatMap((change) => (change.after && change.after.active ? [change.after] : []));
}

export function evaluateRisks(diff: DiffResult): Risk[] {
  const risks: Risk[] = [];
  for (const server of addedOrModifiedServers(diff)) {
    const names = [...server.envNames, ...server.headerNames];
    if (names.some((name) => sensitiveName.test(name))) {
      risks.push(risk(server, "sensitive-name", "high", "New sensitive env or header name is exposed to the MCP server.", "Review whether this server needs the named credential access."));
    }

    const paths = server.pathValues.map((item) => item.absolute ?? item.raw);
    if (paths.some((item) => item.split(path.sep).includes(".ssh") || item.split(path.sep).includes(".env") || path.basename(item) === ".env")) {
      risks.push(risk(server, "sensitive-path", "high", "New path access targets .ssh or .env data.", "Avoid granting MCP servers direct access to credential files unless strictly required."));
    }

    if (paths.some((item) => item === process.env.HOME || item === "~")) {
      risks.push(risk(server, "home-wide-path", "high", "New path access targets the home directory broadly.", "Prefer a narrow project directory or a specific non-sensitive file path."));
    }

    const text = commandText(server);
    if (/\bsudo\b/.test(text)) {
      risks.push(risk(server, "sudo-command", "high", "MCP server command or arguments include sudo.", "Avoid privileged MCP startup commands; review manually if elevated privileges are unavoidable."));
    }

    if (remoteScript.test(text)) {
      risks.push(risk(server, "remote-script-exec", "high", "MCP startup command downloads remote content and pipes it to a shell.", "Use a pinned, installed executable instead of executing remote scripts at startup."));
    }

    if (/\bdocker\b/.test(text) && /:latest\b/.test(text)) {
      risks.push(risk(server, "docker-latest", "medium", "Docker image uses the latest tag, so executed code may change without config changes.", "Pin the image to an immutable version or digest."));
    }
  }
  return risks;
}

