import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "smol-toml";
import { ConfigIssue, ServerSnapshot } from "../types.js";
import { ancestorDirs, isProbablyPath, resolvePathLike } from "../utils/path.js";
import { stringArray, stringMapKeys } from "../utils/json.js";

interface CodexLayer {
  filePath: string;
  servers: Record<string, Record<string, unknown>>;
}

function codexHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function readToml(filePath: string): { value?: Record<string, unknown>; issue?: ConfigIssue } {
  try {
    if (!fs.existsSync(filePath)) return {};
    const parsed = parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { value: {} };
    return { value: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      issue: {
        client: "codex",
        sourcePath: filePath,
        severity: "high",
        message: error instanceof Error ? error.message : "Failed to parse TOML config"
      }
    };
  }
}

function serverTable(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, Record<string, unknown>> = {};
  for (const [name, config] of Object.entries(value as Record<string, unknown>)) {
    if (config && typeof config === "object" && !Array.isArray(config)) result[name] = config as Record<string, unknown>;
  }
  return result;
}

function isTrustedProject(userConfig: Record<string, unknown> | undefined, cwd: string): boolean {
  const projects = userConfig?.projects;
  if (!projects || typeof projects !== "object" || Array.isArray(projects)) return false;
  let matched: Record<string, unknown> | undefined;
  let matchedLength = -1;
  const current = path.resolve(cwd);
  for (const [projectPath, config] of Object.entries(projects as Record<string, unknown>)) {
    if (!config || typeof config !== "object" || Array.isArray(config)) continue;
    const resolved = path.resolve(projectPath);
    if ((current === resolved || current.startsWith(`${resolved}${path.sep}`)) && resolved.length > matchedLength) {
      matched = config as Record<string, unknown>;
      matchedLength = resolved.length;
    }
  }
  return matched?.trust_level === "trusted";
}

function mergeValue(previous: unknown, next: unknown): unknown {
  if (
    previous &&
    next &&
    typeof previous === "object" &&
    typeof next === "object" &&
    !Array.isArray(previous) &&
    !Array.isArray(next)
  ) {
    return { ...(previous as Record<string, unknown>), ...(next as Record<string, unknown>) };
  }
  return next;
}

function mergeServer(layers: Array<Record<string, unknown>>): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      merged[key] = key in merged ? mergeValue(merged[key], value) : value;
    }
  }
  return merged;
}

function fieldBaseDir(name: string, layers: CodexLayer[], field: string): string {
  const source = [...layers].reverse().find((layer) => Object.prototype.hasOwnProperty.call(layer.servers[name] ?? {}, field));
  return source ? path.dirname(source.filePath) : process.cwd();
}

function toServer(name: string, layers: CodexLayer[], clientVersion: string): ServerSnapshot {
  const configs = layers.map((layer) => layer.servers[name]).filter(Boolean);
  const merged = mergeServer(configs);
  const sourcePaths = layers.filter((layer) => layer.servers[name]).map((layer) => layer.filePath);
  const cwdBaseDir = fieldBaseDir(name, layers, "cwd");
  const commandBaseDir = fieldBaseDir(name, layers, "command");
  const argsBaseDir = fieldBaseDir(name, layers, "args");
  const envHeaderVars = Object.values((merged.env_http_headers && typeof merged.env_http_headers === "object" && !Array.isArray(merged.env_http_headers)) ? merged.env_http_headers as Record<string, unknown> : {}).filter((value): value is string => typeof value === "string");
  const envNames = [...new Set([...stringMapKeys(merged.env), ...stringArray(merged.env_vars), ...envHeaderVars, typeof merged.bearer_token_env_var === "string" ? merged.bearer_token_env_var : ""])].filter(Boolean).sort();
  const headerNames = [...new Set([...stringMapKeys(merged.http_headers), ...stringMapKeys(merged.env_http_headers)])].sort();
  const transport = typeof merged.url === "string" ? "http" : typeof merged.command === "string" ? "stdio" : "unknown";
  const enabled = merged.enabled === false ? false : true;
  return {
    client: "codex",
    name,
    enabled,
    active: enabled,
    transport,
    sourcePaths,
    command: typeof merged.command === "string" ? merged.command : undefined,
    args: stringArray(merged.args),
    envNames,
    headerNames,
    cwd: typeof merged.cwd === "string" ? { raw: merged.cwd, absolute: resolvePathLike(merged.cwd, cwdBaseDir) } : undefined,
    url: typeof merged.url === "string" ? merged.url : undefined,
    pathValues: [
      ...(typeof merged.cwd === "string" ? [{ raw: merged.cwd, absolute: resolvePathLike(merged.cwd, cwdBaseDir) }] : []),
      ...(typeof merged.command === "string" && isProbablyPath(merged.command) ? [{ raw: merged.command, absolute: resolvePathLike(merged.command, commandBaseDir) }] : []),
      ...stringArray(merged.args).filter(isProbablyPath).map((raw) => ({ raw, absolute: resolvePathLike(raw, argsBaseDir) }))
    ],
    clientVersion
  };
}

export function loadCodexServers(cwd: string, clientVersion = "unknown"): { servers: ServerSnapshot[]; issues: ConfigIssue[] } {
  const issues: ConfigIssue[] = [];
  const userConfigPath = path.join(codexHome(), "config.toml");
  const userConfig = readToml(userConfigPath);
  if (userConfig.issue) issues.push(userConfig.issue);
  const files = [userConfigPath];
  if (isTrustedProject(userConfig.value, cwd)) {
    files.push(...ancestorDirs(cwd).map((dir) => path.join(dir, ".codex", "config.toml")));
  }
  const layers: CodexLayer[] = [];
  for (const filePath of files) {
    const result = filePath === userConfigPath ? userConfig : readToml(filePath);
    if (result.issue && filePath !== userConfigPath) issues.push(result.issue);
    if (result.value) {
      const servers = serverTable(result.value.mcp_servers);
      if (Object.keys(servers).length > 0) layers.push({ filePath, servers });
    }
  }
  const names = [...new Set(layers.flatMap((layer) => Object.keys(layer.servers)))].sort();
  return { servers: names.map((name) => toServer(name, layers, clientVersion)), issues };
}
