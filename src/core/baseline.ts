import fs from "node:fs";
import path from "node:path";
import { Snapshot } from "../types.js";
import { normalizeSnapshot } from "./snapshot.js";

export const BASELINE_FILE = ".mcpcr-baseline.json";

export function baselinePath(cwd: string): string {
  return path.join(cwd, BASELINE_FILE);
}

export function readBaseline(filePath: string): Snapshot | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Snapshot;
}

export function writeBaseline(filePath: string, snapshot: Snapshot): void {
  fs.writeFileSync(filePath, `${JSON.stringify(normalizeSnapshot(snapshot), null, 2)}\n`);
}

