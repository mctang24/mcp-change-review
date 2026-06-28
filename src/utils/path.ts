import os from "node:os";
import path from "node:path";

export function expandHome(input: string, home = os.homedir()): string {
  if (input === "~") return home;
  if (input.startsWith("~/")) return path.join(home, input.slice(2));
  return input;
}

export function resolvePathLike(raw: string, baseDir: string, home = os.homedir()): string {
  const expanded = expandHome(raw.replaceAll("$HOME", home), home);
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(baseDir, expanded);
}

export function ancestorDirs(startDir: string): string[] {
  const dirs: string[] = [];
  let current = path.resolve(startDir);
  while (true) {
    dirs.unshift(current);
    const parent = path.dirname(current);
    if (parent === current) return dirs;
    current = parent;
  }
}

export function isProbablyPath(value: string): boolean {
  return value === "~" || value.startsWith("~/") || value.includes("/") || value.includes("\\") || value.includes("$HOME");
}

