import test from "node:test";
import assert from "node:assert/strict";
import { diffSnapshots } from "../src/core/diff.js";
import { Snapshot } from "../src/types.js";

function snapshot(command: string): Snapshot {
  return {
    snapshotVersion: 1,
    createdAt: "2026-06-27T00:00:00.000Z",
    cwd: "/tmp/project",
    clients: [{ client: "codex", version: "test" }],
    issues: [],
    servers: [
      {
        client: "codex",
        name: "demo",
        enabled: true,
        active: true,
        transport: "stdio",
        sourcePaths: ["/tmp/project/.codex/config.toml"],
        command,
        args: [],
        envNames: [],
        headerNames: [],
        pathValues: [],
        clientVersion: "test"
      }
    ]
  };
}

test("diffSnapshots reports modified server", () => {
  const changes = diffSnapshots(snapshot("old"), snapshot("new"));
  assert.equal(changes.length, 1);
  assert.equal(changes[0].kind, "modified");
});

