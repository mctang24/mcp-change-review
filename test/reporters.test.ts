import test from "node:test";
import assert from "node:assert/strict";
import { renderJson } from "../src/reporters/json.js";
import { renderMarkdown } from "../src/reporters/markdown.js";
import { renderTerminal } from "../src/reporters/terminal.js";
import { ReviewReport } from "../src/types.js";

function report(): ReviewReport {
  return {
    diff: {
      baselinePath: "/tmp/project/.mcpcr-baseline.json",
      baselineCreated: false,
      after: {
        snapshotVersion: 1,
        createdAt: "2026-06-27T00:00:00.000Z",
        cwd: "/tmp/project",
        clients: [{ client: "codex", version: "test" }],
        issues: [],
        servers: []
      },
      changes: [
        {
          kind: "added",
          after: {
            client: "codex",
            name: "demo",
            enabled: true,
            active: true,
            transport: "stdio",
            sourcePaths: [],
            command: "node",
            args: [],
            envNames: ["API_TOKEN"],
            headerNames: [],
            pathValues: [],
            clientVersion: "test"
          }
        }
      ]
    },
    risks: [
      {
        level: "high",
        client: "codex",
        serverName: "demo",
        ruleId: "sensitive-name",
        reason: "Sensitive name",
        recommendation: "Review access"
      }
    ]
  };
}

test("renderJson returns stable report data", () => {
  const parsed = JSON.parse(renderJson(report()));
  assert.equal(parsed.diff.changes[0].after.client, "codex");
  assert.equal(parsed.risks[0].ruleId, "sensitive-name");
});

test("renderMarkdown includes changes and risks", () => {
  const output = renderMarkdown(report());
  assert.match(output, /MCP Change Review/);
  assert.match(output, /codex\/demo/);
  assert.match(output, /Sensitive name/);
});

test("renderTerminal groups changes and risks by client", () => {
  const output = renderTerminal(report());
  assert.match(output, /Changes: 1[\s\S]*codex:[\s\S]*Risks: 1[\s\S]*codex:/);
});

test("renderTerminal can color the risks header", () => {
  const output = renderTerminal(report(), { color: true });
  assert.match(output, /\u001b\[1;31mRisks: 1\u001b\[0m/);
  assert.match(output, /- high: demo: Sensitive name/);
});

test("renderJson preserves stable top-level and nested field names", () => {
  const parsed = JSON.parse(renderJson(report()));
  assert.deepEqual(Object.keys(parsed), ["diff", "risks"]);
  assert.deepEqual(Object.keys(parsed.diff), ["baselinePath", "baselineCreated", "after", "changes"]);
  assert.deepEqual(Object.keys(parsed.diff.after), ["snapshotVersion", "createdAt", "cwd", "clients", "issues", "servers"]);
  assert.deepEqual(Object.keys(parsed.diff.after.clients[0]), ["client", "version"]);
  assert.deepEqual(Object.keys(parsed.diff.changes[0]), ["kind", "after"]);
  assert.deepEqual(Object.keys(parsed.diff.changes[0].after), [
    "client",
    "name",
    "enabled",
    "active",
    "transport",
    "sourcePaths",
    "command",
    "args",
    "envNames",
    "headerNames",
    "pathValues",
    "clientVersion"
  ]);
  assert.deepEqual(Object.keys(parsed.risks[0]), ["level", "client", "serverName", "ruleId", "reason", "recommendation"]);
});

test("renderMarkdown keeps stable section order and omits secret-shaped values", () => {
  const output = renderMarkdown(report());
  assert.match(output, /^# MCP Change Review\n\n- Baseline: /);
  assert.ok(output.indexOf("## Changes") < output.indexOf("## Risks"));
  assert.doesNotMatch(output, /super-secret-value|Bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]+/);
});
