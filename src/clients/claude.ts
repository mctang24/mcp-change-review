import os from "node:os";
import path from "node:path";
import { ConfigIssue, ServerSnapshot } from "../types.js";
import { objectEntries, readJsonObject, stringArray, stringMapKeys } from "../utils/json.js";
import { ancestorDirs, isProbablyPath, resolvePathLike } from "../utils/path.js";

interface ClaudeEntry {
  name: string;
  scope: "user" | "local" | "project";
  status: "active" | "pending" | "rejected";
  sourcePath: string;
  baseDir: string;
  config: Record<string, unknown>;
}

function claudeFile(): string {
  return path.join(os.homedir(), ".claude.json");
}

function projectApproval(claudeConfig: Record<string, unknown> | undefined, cwd: string): { enabled: Set<string>; disabled: Set<string> } {
  const enabled = new Set<string>();
  const disabled = new Set<string>();
  const projects = claudeConfig?.projects;
  if (!projects || typeof projects !== "object" || Array.isArray(projects)) return { enabled, disabled };
  let matched: Record<string, unknown> | undefined;
  let matchedLength = -1;
  const current = path.resolve(cwd);
  for (const [projectPath, config] of objectEntries(projects)) {
    const resolved = path.resolve(projectPath);
    if ((current === resolved || current.startsWith(`${resolved}${path.sep}`)) && resolved.length > matchedLength) {
      matched = config;
      matchedLength = resolved.length;
    }
  }
  if (matched) {
    for (const name of stringArray(matched.enabledMcpjsonServers)) enabled.add(name);
    for (const name of stringArray(matched.disabledMcpjsonServers)) disabled.add(name);
  }
  return { enabled, disabled };
}

function addEntries(entries: ClaudeEntry[], scope: ClaudeEntry["scope"], sourcePath: string, baseDir: string, servers: unknown, status: ClaudeEntry["status"]): void {
  for (const [name, config] of objectEntries(servers)) {
    entries.push({ name, scope, sourcePath, baseDir, config, status });
  }
}

function pathValues(config: Record<string, unknown>, baseDir: string) {
  const values: string[] = [];
  if (typeof config.command === "string" && isProbablyPath(config.command)) values.push(config.command);
  for (const arg of stringArray(config.args)) {
    if (isProbablyPath(arg)) values.push(arg);
  }
  return values.map((raw) => ({ raw, absolute: resolvePathLike(raw, baseDir) }));
}

function toServer(entry: ClaudeEntry, active: boolean, clientVersion: string): ServerSnapshot {
  const transport = typeof entry.config.url === "string" ? (entry.config.type === "sse" ? "sse" : "http") : typeof entry.config.command === "string" ? "stdio" : "unknown";
  return {
    client: "claude-code",
    name: entry.name,
    enabled: entry.status !== "rejected",
    active,
    transport,
    sourcePaths: [entry.sourcePath],
    scope: entry.scope,
    status: entry.status,
    command: typeof entry.config.command === "string" ? entry.config.command : undefined,
    args: stringArray(entry.config.args),
    envNames: stringMapKeys(entry.config.env),
    headerNames: stringMapKeys(entry.config.headers),
    url: typeof entry.config.url === "string" ? entry.config.url : undefined,
    pathValues: pathValues(entry.config, entry.baseDir),
    clientVersion
  };
}

function chooseActive(entries: ClaudeEntry[]): ClaudeEntry | undefined {
  const local = entries.find((entry) => entry.scope === "local");
  if (local) return local;
  const project = entries.filter((entry) => entry.scope === "project" && entry.status === "active").at(-1);
  if (project) return project;
  const user = entries.find((entry) => entry.scope === "user");
  if (user) return user;
  return undefined;
}

function effectiveEntries(entries: ClaudeEntry[]): ClaudeEntry[] {
  const projectByName = new Map<string, ClaudeEntry>();
  const result: ClaudeEntry[] = [];
  for (const entry of entries) {
    if (entry.scope === "project") projectByName.set(entry.name, entry);
    else result.push(entry);
  }
  return [...result, ...projectByName.values()];
}

export function loadClaudeServers(cwd: string, clientVersion = "unknown"): { servers: ServerSnapshot[]; issues: ConfigIssue[] } {
  const issues: ConfigIssue[] = [];
  const entries: ClaudeEntry[] = [];
  const filePath = claudeFile();
  const claude = readJsonObject(filePath, "claude-code");
  if (claude.issue) issues.push(claude.issue);
  if (claude.value) {
    addEntries(entries, "user", filePath, os.homedir(), claude.value.mcpServers, "active");
    const projects = claude.value.projects;
    for (const [projectPath, config] of objectEntries(projects)) {
      if (path.resolve(projectPath) === path.resolve(cwd)) {
        addEntries(entries, "local", filePath, projectPath, config.mcpServers, "active");
      }
    }
  }

  const approval = projectApproval(claude.value, cwd);
  for (const dir of ancestorDirs(cwd)) {
    const mcpPath = path.join(dir, ".mcp.json");
    const project = readJsonObject(mcpPath, "claude-code");
    if (project.issue) issues.push(project.issue);
    if (!project.value) continue;
    for (const [name, config] of objectEntries(project.value.mcpServers)) {
      const status = approval.disabled.has(name) ? "rejected" : approval.enabled.has(name) ? "active" : "pending";
      entries.push({ name, scope: "project", sourcePath: mcpPath, baseDir: dir, config, status });
    }
  }

  const effective = effectiveEntries(entries);
  const byName = new Map<string, ClaudeEntry[]>();
  for (const entry of effective) byName.set(entry.name, [...(byName.get(entry.name) ?? []), entry]);
  const servers = [...byName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, scopedEntries]) => {
      const activeEntry = chooseActive(scopedEntries);
      return scopedEntries.map((entry) => toServer(entry, entry === activeEntry, clientVersion));
    });
  return { servers, issues };
}
