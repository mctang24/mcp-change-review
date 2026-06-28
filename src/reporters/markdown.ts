import { ReviewReport } from "../types.js";

export function renderMarkdown(report: ReviewReport): string {
  const lines: string[] = [];
  lines.push("# MCP Change Review");
  lines.push("");
  lines.push(`- Baseline: \`${report.diff.baselinePath}\``);
  lines.push(`- Changes: ${report.diff.changes.length}`);
  lines.push(`- Risks: ${report.risks.length}`);
  lines.push("");
  lines.push("## Changes");
  lines.push("");
  if (report.diff.baselineCreated) {
    lines.push("No existing baseline was found. Current MCP configuration has been saved as the initial baseline.");
  } else if (report.diff.changes.length === 0) {
    lines.push("No changes.");
  } else {
    for (const change of report.diff.changes) {
      const server = change.after ?? change.before;
      if (server) lines.push(`- ${change.kind}: ${server.client}/${server.name}`);
    }
  }
  lines.push("");
  lines.push("## Risks");
  lines.push("");
  if (report.risks.length === 0) {
    lines.push("No risks detected by enabled deterministic rules.");
  } else {
    for (const risk of report.risks) lines.push(`- ${risk.level}: ${risk.client}/${risk.serverName}: ${risk.reason}`);
  }
  lines.push("");
  return `${lines.join("\n")}`;
}

