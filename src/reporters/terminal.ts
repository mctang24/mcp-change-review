import { ReviewReport, RiskLevel, ServerChange } from "../types.js";

function changeLabel(change: ServerChange): string {
  const server = change.after ?? change.before;
  const scope = server?.scope ? ` (${server.scope})` : "";
  return server ? `${change.kind}: ${server.client}/${server.name}${scope}` : change.kind;
}

function formatRiskHeader(count: number, color: boolean): string {
  const label = "Risks: " + count;
  return color && count > 0 ? "\u001b[1;31m" + label + "\u001b[0m" : label;
}

export function renderTerminal(report: ReviewReport, options: { color?: boolean } = {}): string {
  const lines: string[] = [];
  const { diff, risks } = report;
  lines.push("MCP Change Review");
  lines.push("");
  lines.push(`Baseline: ${diff.baselinePath}`);
  if (diff.baselineCreated) {
    lines.push("No existing baseline was found. Current MCP configuration has been saved as the initial baseline.");
    lines.push("Add .mcpcr-baseline.json to .gitignore if this is a project directory.");
    return `${lines.join("\n")}\n`;
  }

  lines.push(`Changes: ${diff.changes.length}`);
  if (diff.changes.length === 0) lines.push("No changes.");
  const changeClients = [...new Set(diff.changes.map((change) => (change.after ?? change.before)?.client).filter(Boolean))].sort();
  for (const client of changeClients) {
    lines.push(`${client}:`);
    for (const change of diff.changes.filter((item) => (item.after ?? item.before)?.client === client)) lines.push(`- ${changeLabel(change)}`);
  }

  if (diff.after.issues.length > 0) {
    lines.push("");
    lines.push("Config issues:");
    for (const issue of diff.after.issues) lines.push(`- ${issue.severity}: ${issue.client}: ${issue.message} (${issue.sourcePath})`);
  }

  lines.push("");
  lines.push(formatRiskHeader(risks.length, options.color === true));
  if (risks.length === 0) lines.push("No risks detected by enabled deterministic rules.");
  const riskClients = [...new Set(risks.map((risk) => risk.client))].sort();
  for (const client of riskClients) {
    lines.push(`${client}:`);
    for (const item of risks.filter((risk) => risk.client === client)) lines.push("- " + item.level + ": " + item.serverName + ": " + item.reason);
  }
  return `${lines.join("\n")}\n`;
}

export function hasFailingRisk(report: ReviewReport, failOn?: RiskLevel): boolean {
  if (!failOn) return false;
  const rank: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
  return report.risks.some((risk) => rank[risk.level] >= rank[failOn]);
}
