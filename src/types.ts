export type ClientId = "codex" | "claude-code";

export type RiskLevel = "low" | "medium" | "high";

export type ChangeKind = "added" | "removed" | "modified";

export type Transport = "stdio" | "http" | "sse" | "unknown";

export interface ClientVersion {
  client: ClientId;
  version: string;
}

export interface PathValue {
  raw: string;
  absolute?: string;
}

export interface ServerSnapshot {
  client: ClientId;
  name: string;
  enabled: boolean;
  active: boolean;
  transport: Transport;
  sourcePaths: string[];
  scope?: string;
  status?: string;
  command?: string;
  args: string[];
  envNames: string[];
  headerNames: string[];
  cwd?: PathValue;
  url?: string;
  pathValues: PathValue[];
  clientVersion: string;
}

export interface ConfigIssue {
  client: ClientId;
  sourcePath: string;
  message: string;
  severity: RiskLevel;
}

export interface Snapshot {
  snapshotVersion: 1;
  createdAt: string;
  cwd: string;
  clients: ClientVersion[];
  servers: ServerSnapshot[];
  issues: ConfigIssue[];
}

export interface ServerChange {
  kind: ChangeKind;
  before?: ServerSnapshot;
  after?: ServerSnapshot;
}

export interface DiffResult {
  baselinePath: string;
  baselineCreated: boolean;
  before?: Snapshot;
  after: Snapshot;
  changes: ServerChange[];
}

export interface Risk {
  level: RiskLevel;
  client: ClientId;
  serverName: string;
  ruleId: string;
  reason: string;
  recommendation: string;
}

export interface ReviewReport {
  diff: DiffResult;
  risks: Risk[];
}

