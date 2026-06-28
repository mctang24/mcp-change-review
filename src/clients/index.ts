import { execFileSync } from "node:child_process";
import { Snapshot } from "../types.js";
import { loadClaudeServers } from "./claude.js";
import { loadCodexServers } from "./codex.js";
import { normalizeSnapshot } from "../core/snapshot.js";

function commandVersion(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

export function collectSnapshot(cwd: string): Snapshot {
  const codexVersion = commandVersion("codex", ["--version"]);
  const claudeVersion = commandVersion("claude", ["--version"]);
  const codex = loadCodexServers(cwd, codexVersion);
  const claude = loadClaudeServers(cwd, claudeVersion);
  return normalizeSnapshot({
    snapshotVersion: 1,
    createdAt: new Date().toISOString(),
    cwd,
    clients: [
      { client: "codex", version: codexVersion },
      { client: "claude-code", version: claudeVersion }
    ],
    servers: [...codex.servers, ...claude.servers],
    issues: [...codex.issues, ...claude.issues]
  });
}

