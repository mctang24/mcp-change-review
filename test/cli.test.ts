import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const cliPath = path.resolve("dist/src/cli.js");

function run(cwd: string, args: string[], env: NodeJS.ProcessEnv, input?: string) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: { ...process.env, ...env },
    input,
    encoding: "utf8"
  });
}

function fixture(prefix: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const home = path.join(root, "home");
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  return { root, home, codexHome, project, env: { HOME: home, CODEX_HOME: codexHome } };
}

test("cli diff creates initial baseline when config is valid", () => {
  const f = fixture("mcpcr-cli-diff-");
  const result = run(f.project, ["diff"], f.env);
  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(path.join(f.project, ".mcpcr-baseline.json")), true);
});

test("cli diff does not create baseline when config has high issue", () => {
  const f = fixture("mcpcr-cli-bad-");
  fs.writeFileSync(path.join(f.codexHome, "config.toml"), "[mcp_servers.demo");
  const result = run(f.project, ["diff"], f.env);
  assert.equal(result.status, 1);
  assert.equal(fs.existsSync(path.join(f.project, ".mcpcr-baseline.json")), false);
});

test("cli fail-on high exits non-zero for high risk", () => {
  const f = fixture("mcpcr-cli-fail-");
  assert.equal(run(f.project, ["diff"], f.env).status, 0);
  fs.writeFileSync(path.join(f.codexHome, "config.toml"), "[mcp_servers.demo]\ncommand = \"node\"\nenv_vars = [\"API_TOKEN\"]\n");
  const result = run(f.project, ["diff", "--fail-on", "high"], f.env);
  assert.equal(result.status, 1);
});

test("cli export refuses to overwrite without force", () => {
  const f = fixture("mcpcr-cli-export-");
  assert.equal(run(f.project, ["export", "json"], f.env).status, 0);
  const result = run(f.project, ["export", "json"], f.env);
  assert.equal(result.status, 1);
});

test("cli export does not create initial baseline", () => {
  const f = fixture("mcpcr-cli-export-no-baseline-");
  assert.equal(run(f.project, ["export", "json"], f.env).status, 0);
  assert.equal(fs.existsSync(path.join(f.project, ".mcpcr-baseline.json")), false);
});

test("cli export overwrites with force", () => {
  const f = fixture("mcpcr-cli-export-force-");
  assert.equal(run(f.project, ["export", "json"], f.env).status, 0);
  const result = run(f.project, ["export", "json", "--force"], f.env);
  assert.equal(result.status, 0);
});

test("cli accept shows summary before confirmation and does not write on rejection", () => {
  const f = fixture("mcpcr-cli-accept-");
  assert.equal(run(f.project, ["diff"], f.env).status, 0);
  fs.writeFileSync(path.join(f.codexHome, "config.toml"), "[mcp_servers.demo]\ncommand = \"node\"\nenv_vars = [\"API_TOKEN\"]\n");
  const result = run(f.project, ["accept"], f.env, "n\n");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Changes: 1[\s\S]*Update baseline/);
  const after = run(f.project, ["diff", "--fail-on", "high"], f.env);
  assert.equal(after.status, 1);
});

test("cli accept writes baseline after confirmation", () => {
  const f = fixture("mcpcr-cli-accept-yes-");
  assert.equal(run(f.project, ["diff"], f.env).status, 0);
  fs.writeFileSync(path.join(f.codexHome, "config.toml"), "[mcp_servers.demo]\ncommand = \"node\"\nenv_vars = [\"API_TOKEN\"]\n");
  assert.equal(run(f.project, ["accept"], f.env, "y\n").status, 0);
  const after = run(f.project, ["diff", "--fail-on", "high"], f.env);
  assert.equal(after.status, 0);
});

test("cli accept creates baseline only after confirmation when no baseline exists", () => {
  const f = fixture("mcpcr-cli-accept-initial-");
  const rejected = run(f.project, ["accept"], f.env, "n\n");
  assert.equal(rejected.status, 0);
  assert.equal(fs.existsSync(path.join(f.project, ".mcpcr-baseline.json")), false);
  const accepted = run(f.project, ["accept"], f.env, "y\n");
  assert.equal(accepted.status, 0);
  assert.equal(fs.existsSync(path.join(f.project, ".mcpcr-baseline.json")), true);
});

test("cli accept does not write baseline when config has high issue", () => {
  const f = fixture("mcpcr-cli-accept-bad-");
  fs.writeFileSync(path.join(f.codexHome, "config.toml"), "[mcp_servers.demo");
  const result = run(f.project, ["accept"], f.env, "y\n");
  assert.equal(result.status, 1);
  assert.equal(fs.existsSync(path.join(f.project, ".mcpcr-baseline.json")), false);
});

test("cli terminal output groups changes and risks by client", () => {
  const f = fixture("mcpcr-cli-group-");
  assert.equal(run(f.project, ["diff"], f.env).status, 0);
  fs.writeFileSync(path.join(f.codexHome, "config.toml"), "[mcp_servers.demo]\ncommand = \"node\"\nenv_vars = [\"API_TOKEN\"]\n");
  const result = run(f.project, ["diff", "--fail-on", "high"], f.env);
  assert.match(result.stdout, /Changes: 1[\s\S]*codex:[\s\S]*Risks: 1[\s\S]*codex:/);
});
