import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { writeBaseline } from "../src/core/baseline.js";
import { Snapshot } from "../src/types.js";

test("writeBaseline only writes fields present in the sanitized snapshot", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-baseline-"));
  const filePath = path.join(dir, ".mcpcr-baseline.json");
  const snapshot: Snapshot = {
    snapshotVersion: 1,
    createdAt: "2026-06-27T00:00:00.000Z",
    cwd: dir,
    clients: [{ client: "codex", version: "test" }],
    issues: [],
    servers: [
      {
        client: "codex",
        name: "demo",
        enabled: true,
        active: true,
        transport: "stdio",
        sourcePaths: [],
        command: "demo",
        args: [],
        envNames: ["SECRET_TOKEN"],
        headerNames: [],
        pathValues: [],
        clientVersion: "test"
      }
    ]
  };
  writeBaseline(filePath, snapshot);
  const raw = fs.readFileSync(filePath, "utf8");
  assert.match(raw, /SECRET_TOKEN/);
});
