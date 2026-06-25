export const LOCAL_A3_SCHEMA_VERSION = 1;

export const LOCAL_A3_STATUSES = ["open", "in_progress", "waiting_review", "closed", "cancelled"] as const;
export const LOCAL_A3_DASHBOARD_TYPES = ["ssz", "tessa", "print", "support"] as const;
export const LOCAL_A3_EVENT_TYPES = [
  "created",
  "status_changed",
  "owner_changed",
  "due_date_changed",
  "form_updated",
  "comment_added",
  "closed",
  "reopened",
  "imported",
] as const;

export type LocalA3Status = (typeof LOCAL_A3_STATUSES)[number];
export type LocalA3DashboardType = (typeof LOCAL_A3_DASHBOARD_TYPES)[number];
export type LocalA3EventType = (typeof LOCAL_A3_EVENT_TYPES)[number];

export type LocalA3Period = {
  from?: string;
  to?: string;
  label: string;
};

export type LocalA3Source = {
  fileName?: string;
  reportFingerprint?: string;
};

export type LocalA3Deviation = {
  title: string;
  metricKey?: string;
  metricLabel?: string;
  fact?: string;
  target?: string;
  scale?: string;
  context?: string;
};

export type LocalA3Form = {
  problem: string;
  cause: string;
  solution: string;
  owner: string;
  dueDate?: string;
  expectedResult: string;
  checkCriteria: string;
};

export type LocalA3Protocol = {
  schemaVersion: 1;
  id: string;
  status: LocalA3Status;
  dashboardType: LocalA3DashboardType;
  dashboardTitle: string;
  period: LocalA3Period;
  source: LocalA3Source;
  deviation: LocalA3Deviation;
  form: LocalA3Form;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

export type LocalA3Comment = {
  id: string;
  text: string;
  authorName?: string;
  createdAt: string;
};

export type LocalA3EventPayload =
  | { type: "created" }
  | { type: "status_changed"; from: LocalA3Status; to: LocalA3Status }
  | { type: "owner_changed"; from?: string; to: string }
  | { type: "due_date_changed"; from?: string; to?: string }
  | { type: "form_updated"; fields: Array<keyof LocalA3Form> }
  | { type: "comment_added"; comment: LocalA3Comment }
  | { type: "closed"; closedAt: string }
  | { type: "reopened"; from: "closed"; to: Exclude<LocalA3Status, "closed"> }
  | { type: "imported"; importedAt: string; source: "archive" | "single-protocol" };

export type LocalA3Event = {
  schemaVersion: 1;
  id: string;
  protocolId: string;
  type: LocalA3EventType;
  createdAt: string;
  actorName?: string;
  payload: LocalA3EventPayload;
};

export type LocalA3ProtocolSnapshot = {
  schemaVersion: 1;
  id: string;
  protocolId: string;
  status: LocalA3Status;
  dashboardType: LocalA3DashboardType;
  title: string;
  owner?: string;
  dueDate?: string;
  periodLabel: string;
  deviationTitle: string;
  metricLabel?: string;
  commentCount: number;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

export type LocalA3ArchiveEnvelope = {
  kind: "raport-local-a3-archive";
  schemaVersion: 1;
  exportedAt: string;
  app: {
    name: "raport";
    feature: "local-a3";
  };
  protocols: LocalA3Protocol[];
  events: LocalA3Event[];
  snapshots: LocalA3ProtocolSnapshot[];
};

export type LocalA3ImportError = {
  path: string;
  message: string;
};

export type LocalA3ParseResult =
  | { success: true; archive: LocalA3ArchiveEnvelope; errors: [] }
  | { success: false; archive?: undefined; errors: LocalA3ImportError[] };

export type LocalA3ImportResult = {
  added: number;
  updated: number;
  skipped: number;
  errors: LocalA3ImportError[];
};

export type LocalA3MergeResult = LocalA3ImportResult & {
  archive: LocalA3ArchiveEnvelope;
};
