import { collectSnapshot } from "../clients/index.js";
import { ReviewReport } from "../types.js";
import { baselinePath, readBaseline, writeBaseline } from "./baseline.js";
import { createDiffResult } from "./diff.js";
import { evaluateRisks } from "./risk.js";

export function createReview(cwd: string, options: { autoCreateBaseline?: boolean } = {}): ReviewReport {
  const autoCreateBaseline = options.autoCreateBaseline ?? true;
  const filePath = baselinePath(cwd);
  const before = readBaseline(filePath);
  const after = collectSnapshot(cwd);
  const shouldCreateBaseline = autoCreateBaseline && !before && after.issues.length === 0;
  if (shouldCreateBaseline) writeBaseline(filePath, after);
  const diff = createDiffResult(filePath, before, after, shouldCreateBaseline);
  return { diff, risks: evaluateRisks(diff) };
}

export function acceptCurrent(cwd: string, commit = true): ReviewReport {
  const filePath = baselinePath(cwd);
  const before = readBaseline(filePath);
  const after = collectSnapshot(cwd);
  const canCommit = !after.issues.some((issue) => issue.severity === "high");
  const diff = createDiffResult(filePath, before, after, commit && canCommit && !before);
  const report = { diff, risks: evaluateRisks(diff) };
  if (commit && canCommit) writeBaseline(filePath, after);
  return report;
}
