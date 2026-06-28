import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadClaudeServers } from "../src/clients/claude.js";

test("loadClaudeServers lets approved project override user server", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({
    mcpServers: { demo: { command: "user-command", env: { SECRET_TOKEN: "secret" } } },
    projects: { [project]: { enabledMcpjsonServers: ["demo"] } }
  }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({
    mcpServers: { demo: { command: "project-command" } }
  }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    const active = result.servers.find((server) => server.active);
    assert.equal(result.servers.length, 2);
    assert.equal(active?.command, "project-command");
    assert.equal(active?.scope, "project");
    assert.doesNotMatch(JSON.stringify(result), /secret/);
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers records pending project server with same name as active user server", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-same-name-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({ mcpServers: { demo: { command: "user-command" } } }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "project-command" } } }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    const user = result.servers.find((server) => server.scope === "user");
    const projectServer = result.servers.find((server) => server.scope === "project");
    assert.equal(result.servers.length, 2);
    assert.equal(user?.active, true);
    assert.equal(projectServer?.active, false);
    assert.equal(projectServer?.status, "pending");
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers keeps pending project server inactive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-pending-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), "{}");
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "project-command" } } }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    assert.equal(result.servers[0].scope, "project");
    assert.equal(result.servers[0].active, false);
    assert.equal(result.servers[0].status, "pending");
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers keeps rejected project server recorded but inactive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-rejected-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({ projects: { [project]: { disabledMcpjsonServers: ["demo"] } } }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "project-command" } } }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    assert.equal(result.servers[0].enabled, false);
    assert.equal(result.servers[0].active, false);
    assert.equal(result.servers[0].status, "rejected");
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers inherits project approval from parent directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-sub-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  const subdir = path.join(project, "sub");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(subdir, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({ projects: { [project]: { enabledMcpjsonServers: ["demo"] } } }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "project-command" } } }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(subdir, "test");
    assert.equal(result.servers[0].active, true);
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers does not use approval from unrelated project", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-unrelated-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  const otherProject = path.join(root, "other");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(otherProject, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({ projects: { [otherProject]: { enabledMcpjsonServers: ["demo"] } } }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "project-command" } } }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    assert.equal(result.servers[0].active, false);
    assert.equal(result.servers[0].status, "pending");
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers uses nearest project config for duplicate project server", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-layer-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  const subdir = path.join(project, "sub");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(subdir, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({ projects: { [project]: { enabledMcpjsonServers: ["demo"] } } }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "root-command" } } }));
  fs.writeFileSync(path.join(subdir, ".mcp.json"), JSON.stringify({ mcpServers: { demo: { command: "sub-command" } } }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(subdir, "test");
    assert.equal(result.servers[0].command, "sub-command");
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers reports bad JSON as config issue", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-bad-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), "{");
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].severity, "high");
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});

test("loadClaudeServers records rejected project duplicate without overriding active user server or leaking values", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcpcr-claude-rejected-duplicate-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(home, ".claude.json"), JSON.stringify({
    mcpServers: { demo: { command: "user-command", headers: { Authorization: "secret-header-value" } } },
    projects: { [project]: { disabledMcpjsonServers: ["demo"] } }
  }));
  fs.writeFileSync(path.join(project, ".mcp.json"), JSON.stringify({
    mcpServers: { demo: { command: "project-command", env: { SECRET_TOKEN: "secret-token-value" } } }
  }));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    const result = loadClaudeServers(project, "test");
    const active = result.servers.find((server) => server.active);
    const rejected = result.servers.find((server) => server.scope === "project");
    assert.equal(result.servers.length, 2);
    assert.equal(active?.scope, "user");
    assert.equal(active?.command, "user-command");
    assert.equal(rejected?.enabled, false);
    assert.equal(rejected?.active, false);
    assert.equal(rejected?.status, "rejected");
    assert.deepEqual(active?.headerNames, ["Authorization"]);
    assert.deepEqual(rejected?.envNames, ["SECRET_TOKEN"]);
    assert.doesNotMatch(JSON.stringify(result), /secret-header-value|secret-token-value/);
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  }
});
