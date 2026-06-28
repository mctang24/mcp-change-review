import fs from "node:fs";
import { ConfigIssue } from "../types.js";

export function readJsonObject(filePath: string, client: ConfigIssue["client"]): { value?: Record<string, unknown>; issue?: ConfigIssue } {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return { value: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        issue: {
          client,
          sourcePath: filePath,
          severity: "high",
          message: "JSON config root must be an object"
        }
      };
    }
    return { value: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      issue: {
        client,
        sourcePath: filePath,
        severity: "high",
        message: error instanceof Error ? error.message : "Failed to parse JSON config"
      }
    };
  }
}

export function objectEntries(value: unknown): Array<[string, Record<string, unknown>]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, Record<string, unknown>] => {
    const item = entry[1];
    return !!item && typeof item === "object" && !Array.isArray(item);
  });
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function stringMapKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort();
}

