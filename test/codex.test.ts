import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadCodexServers } from "../src/clients/codex.js";

function trustedProjectToml(project: string): string {
  return `[projects.${JSON.stringify(project)}]\ntrust_level = "trusted"\n`;
}

test("loadCodexServers merges layers and records only env names", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(path.join(project, ".codex"), { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), `${trustedProjectToml(project)}[mcp_servers.demo]\ncommand = "node"\nargs = ["server.js"]\nenv = { SECRET_TOKEN = "super-secret-value" }\n`);
  fs.writeFileSync(path.join(project, ".codex", "config.toml"), "[mcp_servers.demo]\nargs = [\"project-server.js\"]\nenv_vars = [\"PROJECT_TOKEN\"]\n");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.equal(result.servers.length, 1);
    assert.equal(result.servers[0].command, "node");
    assert.deepEqual(result.servers[0].args, ["project-server.js"]);
    assert.deepEqual(result.servers[0].envNames, ["PROJECT_TOKEN", "SECRET_TOKEN"]);
    assert.equal(JSON.stringify(result), JSON.stringify(result).replace("super-secret-value", ""));
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("loadCodexServers keeps disabled server inactive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-disabled-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), "[mcp_servers.demo]\nenabled = false\ncommand = \"node\"\nenv_vars = [\"API_TOKEN\"]\n");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.equal(result.servers[0].enabled, false);
    assert.equal(result.servers[0].active, false);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("loadCodexServers records HTTP header names and env header variable names without values", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-http-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), "[mcp_servers.web]\nurl = \"https://example.invalid/mcp\"\nhttp_headers = { Authorization = \"secret-header-value\" }\nenv_http_headers = { \"X-API-Key\" = \"API_TOKEN\" }\n");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.deepEqual(result.servers[0].headerNames, ["Authorization", "X-API-Key"]);
    assert.deepEqual(result.servers[0].envNames, ["API_TOKEN"]);
    assert.doesNotMatch(JSON.stringify(result), /secret-header-value/);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("loadCodexServers reports bad TOML as config issue", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-bad-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), "[mcp_servers.demo");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].severity, "high");
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("loadCodexServers ignores project config when project is untrusted", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-untrusted-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(path.join(project, ".codex"), { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), "[mcp_servers.user]\ncommand = \"user-command\"\n");
  fs.writeFileSync(path.join(project, ".codex", "config.toml"), "[mcp_servers.project]\ncommand = \"project-command\"\n");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.deepEqual(result.servers.map((server) => server.name), ["user"]);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("loadCodexServers resolves inherited relative cwd from declaring layer", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-cwd-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(path.join(project, ".codex"), { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), `${trustedProjectToml(project)}[mcp_servers.demo]\ncommand = "node"\ncwd = "user-data"\n`);
  fs.writeFileSync(path.join(project, ".codex", "config.toml"), "[mcp_servers.demo]\nargs = [\"project-server.js\"]\n");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.equal(result.servers[0].cwd?.absolute, path.join(codexHome, "user-data"));
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test("loadCodexServers records disabled HTTP env headers without activation or value leakage", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-codex-disabled-http-"));
  const codexHome = path.join(root, "codex-home");
  const project = path.join(root, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), "[mcp_servers.web]\nenabled = false\nurl = \"https://example.invalid/mcp\"\nhttp_headers = { Authorization = \"super-secret-header\" }\nenv_http_headers = { \"X-API-Key\" = \"API_KEY\" }\nbearer_token_env_var = \"BEARER_TOKEN\"\n");
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const result = loadCodexServers(project, "test");
    assert.equal(result.servers.length, 1);
    assert.equal(result.servers[0].transport, "http");
    assert.equal(result.servers[0].enabled, false);
    assert.equal(result.servers[0].active, false);
    assert.deepEqual(result.servers[0].headerNames, ["Authorization", "X-API-Key"]);
    assert.deepEqual(result.servers[0].envNames, ["API_KEY", "BEARER_TOKEN"]);
    assert.doesNotMatch(JSON.stringify(result), /super-secret-header/);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});
