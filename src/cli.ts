#!/usr/bin/env node
import fs from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { collectSnapshot } from "./clients/index.js";
import { BASELINE_FILE, baselinePath, readBaseline } from "./core/baseline.js";
import { acceptCurrent, createReview } from "./core/review.js";
import { renderJson } from "./reporters/json.js";
import { renderMarkdown } from "./reporters/markdown.js";
import { hasFailingRisk, renderTerminal } from "./reporters/terminal.js";
import { RiskLevel } from "./types.js";

const useColor = process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], ...names: string[]): boolean {
  return names.some((name) => args.includes(name));
}

function writeNewFile(filePath: string, content: string, force: boolean): void {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`${filePath} already exists. Use --force to overwrite.`);
  }
  fs.writeFileSync(filePath, content);
}

async function confirmAccept(): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("Update baseline with current MCP configuration? This will not save env/header values. [y/N] ");
  rl.close();
  return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
}

async function main(): Promise<void> {
  const [, , command = "diff", ...args] = process.argv;
  const cwd = process.cwd();

  if (command === "list") {
    const snapshot = collectSnapshot(cwd);
    for (const client of snapshot.clients) console.log(`${client.client}: ${client.version}`);
    for (const server of snapshot.servers) console.log(`${server.client}/${server.name} ${server.enabled ? "enabled" : "disabled"} ${server.active ? "active" : "inactive"}`);
    return;
  }

  if (command === "status") {
    const filePath = baselinePath(cwd);
    const baseline = readBaseline(filePath);
    console.log(baseline ? `Baseline exists: ${filePath}` : `Baseline missing: ${filePath}`);
    return;
  }

  if (command === "accept") {
    const yes = hasFlag(args, "-y", "--yes");
    const report = acceptCurrent(cwd, false);
    console.log(renderTerminal(report, { color: useColor }));
    if (!yes && !(await confirmAccept())) {
      console.log("Baseline unchanged.");
      return;
    }
    if (report.diff.after.issues.some((issue) => issue.severity === "high")) {
      console.error("Baseline unchanged because high severity config issues were found.");
      process.exitCode = 1;
      return;
    }
    acceptCurrent(cwd);
    return;
  }

  if (command === "export") {
    const format = args[0];
    const force = hasFlag(args, "-f", "--force");
    const report = createReview(cwd, { autoCreateBaseline: false });
    if (format === "md") {
      writeNewFile("mcp-review.md", renderMarkdown(report), force);
      console.log("Wrote mcp-review.md");
      return;
    }
    if (format === "json") {
      writeNewFile("mcp-review.json", renderJson(report), force);
      console.log("Wrote mcp-review.json");
      return;
    }
    throw new Error("Usage: mcpcr export md|json [-f|--force]");
  }

  if (command === "diff") {
    const failOn = flagValue(args, "--fail-on") as RiskLevel | undefined;
    const report = createReview(cwd);
    console.log(renderTerminal(report, { color: useColor }));
    if (report.diff.after.issues.some((issue) => issue.severity === "high") || hasFailingRisk(report, failOn)) process.exitCode = 1;
    return;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`mcpcr commands: list, status, diff, accept, export\nBaseline file: ${BASELINE_FILE}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
