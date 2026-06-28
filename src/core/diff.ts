import { DiffResult, ServerChange, ServerSnapshot, Snapshot } from "../types.js";
import { stableServerId } from "./snapshot.js";

function comparable(server: ServerSnapshot): unknown {
  return {
    client: server.client,
    name: server.name,
    enabled: server.enabled,
    active: server.active,
    transport: server.transport,
    scope: server.scope,
    status: server.status,
    command: server.command,
    args: server.args,
    envNames: server.envNames,
    headerNames: server.headerNames,
    cwd: server.cwd,
    url: server.url,
    pathValues: server.pathValues
  };
}

export function diffSnapshots(before: Snapshot | undefined, after: Snapshot): ServerChange[] {
  if (!before) return [];
  const previous = new Map(before.servers.map((server) => [stableServerId(server), server]));
  const current = new Map(after.servers.map((server) => [stableServerId(server), server]));
  const ids = [...new Set([...previous.keys(), ...current.keys()])].sort();
  const changes: ServerChange[] = [];
  for (const id of ids) {
    const oldServer = previous.get(id);
    const newServer = current.get(id);
    if (!oldServer && newServer) changes.push({ kind: "added", after: newServer });
    else if (oldServer && !newServer) changes.push({ kind: "removed", before: oldServer });
    else if (oldServer && newServer && JSON.stringify(comparable(oldServer)) !== JSON.stringify(comparable(newServer))) {
      changes.push({ kind: "modified", before: oldServer, after: newServer });
    }
  }
  return changes;
}

export function createDiffResult(baselinePath: string, before: Snapshot | undefined, after: Snapshot, baselineCreated = !before): DiffResult {
  return {
    baselinePath,
    baselineCreated,
    before,
    after,
    changes: diffSnapshots(before, after)
  };
}
