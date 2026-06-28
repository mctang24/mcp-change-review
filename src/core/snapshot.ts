import { Snapshot, ServerSnapshot } from "../types.js";

export function stableServerId(server: Pick<ServerSnapshot, "client" | "name">): string {
  const scoped = server as Pick<ServerSnapshot, "client" | "name" | "scope" | "sourcePaths">;
  if (scoped.client === "claude-code" && scoped.scope) {
    return `${scoped.client}:${scoped.scope}:${scoped.name}:${scoped.sourcePaths?.[0] ?? ""}`;
  }
  return `${server.client}:${server.name}`;
}

export function sortServers(servers: ServerSnapshot[]): ServerSnapshot[] {
  return [...servers].sort((a, b) => stableServerId(a).localeCompare(stableServerId(b)));
}

export function normalizeSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    clients: [...snapshot.clients].sort((a, b) => a.client.localeCompare(b.client)),
    servers: sortServers(snapshot.servers),
    issues: [...snapshot.issues].sort((a, b) => `${a.client}:${a.sourcePath}:${a.message}`.localeCompare(`${b.client}:${b.sourcePath}:${b.message}`))
  };
}
