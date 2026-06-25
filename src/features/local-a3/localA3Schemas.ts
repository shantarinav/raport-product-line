import { z } from "zod";
import {
  LOCAL_A3_DASHBOARD_TYPES,
  LOCAL_A3_EVENT_TYPES,
  LOCAL_A3_SCHEMA_VERSION,
  LOCAL_A3_STATUSES,
  type LocalA3ArchiveEnvelope,
  type LocalA3Event,
  type LocalA3ImportError,
  type LocalA3ParseResult,
  type LocalA3Protocol,
  type LocalA3ProtocolSnapshot,
} from "./localA3Types";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function trimString(maxLength: number) {
  return z.string().trim().min(1).max(maxLength);
}

function optionalTrimString(maxLength: number) {
  return z.string().trim().max(maxLength).optional();
}

function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

function isValidIsoDateTime(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

export const localA3DashboardTypeSchema = z.enum(LOCAL_A3_DASHBOARD_TYPES);
export const localA3StatusSchema = z.enum(LOCAL_A3_STATUSES);
export const localA3EventTypeSchema = z.enum(LOCAL_A3_EVENT_TYPES);
export const localA3IsoDateSchema = z.string().refine(isValidDateOnly, "Expected YYYY-MM-DD date");
export const localA3IsoDateTimeSchema = z.string().refine(isValidIsoDateTime, "Expected canonical ISO datetime");

export const localA3PeriodSchema = z
  .object({
    from: localA3IsoDateSchema.optional(),
    to: localA3IsoDateSchema.optional(),
    label: trimString(120),
  })
  .strict()
  .superRefine((period, context) => {
    if (period.from && period.to && period.from > period.to) {
      context.addIssue({ code: "custom", message: "period.from must be before or equal period.to", path: ["from"] });
    }
  });

export const localA3SourceSchema = z
  .object({
    fileName: optionalTrimString(240),
    reportFingerprint: optionalTrimString(160),
  })
  .strict();

export const localA3DeviationSchema = z
  .object({
    title: trimString(240),
    metricKey: optionalTrimString(120),
    metricLabel: optionalTrimString(160),
    fact: optionalTrimString(240),
    target: optionalTrimString(240),
    scale: optionalTrimString(240),
    context: optionalTrimString(1000),
  })
  .strict();

export const localA3FormSchema = z
  .object({
    problem: trimString(4000),
    cause: trimString(4000),
    solution: trimString(4000),
    owner: trimString(160),
    dueDate: localA3IsoDateSchema.optional(),
    expectedResult: trimString(4000),
    checkCriteria: trimString(4000),
  })
  .strict();

export const localA3ProtocolV1Schema = z
  .object({
    schemaVersion: z.literal(LOCAL_A3_SCHEMA_VERSION),
    id: trimString(120),
    status: localA3StatusSchema,
    dashboardType: localA3DashboardTypeSchema,
    dashboardTitle: trimString(120),
    period: localA3PeriodSchema,
    source: localA3SourceSchema,
    deviation: localA3DeviationSchema,
    form: localA3FormSchema,
    createdAt: localA3IsoDateTimeSchema,
    updatedAt: localA3IsoDateTimeSchema,
    closedAt: localA3IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((protocol, context) => {
    if (protocol.updatedAt < protocol.createdAt) {
      context.addIssue({ code: "custom", message: "updatedAt must be after createdAt", path: ["updatedAt"] });
    }
    if (protocol.status === "closed" && !protocol.closedAt) {
      context.addIssue({ code: "custom", message: "closedAt is required when status is closed", path: ["closedAt"] });
    }
    if (protocol.status !== "closed" && protocol.closedAt) {
      context.addIssue({ code: "custom", message: "closedAt is allowed only when status is closed", path: ["closedAt"] });
    }
  });

export const localA3CommentSchema = z
  .object({
    id: trimString(120),
    text: trimString(4000),
    authorName: optionalTrimString(160),
    createdAt: localA3IsoDateTimeSchema,
  })
  .strict();

const localA3EventPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("created") }).strict(),
  z.object({ type: z.literal("status_changed"), from: localA3StatusSchema, to: localA3StatusSchema }).strict(),
  z.object({ type: z.literal("owner_changed"), from: optionalTrimString(160), to: trimString(160) }).strict(),
  z.object({ type: z.literal("due_date_changed"), from: localA3IsoDateSchema.optional(), to: localA3IsoDateSchema.optional() }).strict(),
  z
    .object({
      type: z.literal("form_updated"),
      fields: z.array(z.enum(["problem", "cause", "solution", "owner", "dueDate", "expectedResult", "checkCriteria"])).min(1),
    })
    .strict(),
  z.object({ type: z.literal("comment_added"), comment: localA3CommentSchema }).strict(),
  z.object({ type: z.literal("closed"), closedAt: localA3IsoDateTimeSchema }).strict(),
  z.object({ type: z.literal("reopened"), from: z.literal("closed"), to: z.enum(["open", "in_progress", "waiting_review", "cancelled"]) }).strict(),
  z.object({ type: z.literal("imported"), importedAt: localA3IsoDateTimeSchema, source: z.enum(["archive", "single-protocol"]) }).strict(),
]);

export const localA3EventV1Schema = z
  .object({
    schemaVersion: z.literal(LOCAL_A3_SCHEMA_VERSION),
    id: trimString(120),
    protocolId: trimString(120),
    type: localA3EventTypeSchema,
    createdAt: localA3IsoDateTimeSchema,
    actorName: optionalTrimString(160),
    payload: localA3EventPayloadSchema,
  })
  .strict()
  .superRefine((event, context) => {
    if (event.payload.type !== event.type) {
      context.addIssue({ code: "custom", message: "event payload type must match event type", path: ["payload", "type"] });
    }
    if (event.type === "status_changed" && event.payload.type === "status_changed" && event.payload.from === event.payload.to) {
      context.addIssue({ code: "custom", message: "status_changed requires different statuses", path: ["payload", "to"] });
    }
  });

export const localA3ProtocolSnapshotV1Schema = z
  .object({
    schemaVersion: z.literal(LOCAL_A3_SCHEMA_VERSION),
    id: trimString(120),
    protocolId: trimString(120),
    status: localA3StatusSchema,
    dashboardType: localA3DashboardTypeSchema,
    title: trimString(240),
    owner: optionalTrimString(160),
    dueDate: localA3IsoDateSchema.optional(),
    periodLabel: trimString(120),
    deviationTitle: trimString(240),
    metricLabel: optionalTrimString(160),
    commentCount: z.number().int().min(0),
    eventCount: z.number().int().min(0),
    createdAt: localA3IsoDateTimeSchema,
    updatedAt: localA3IsoDateTimeSchema,
    closedAt: localA3IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.updatedAt < snapshot.createdAt) {
      context.addIssue({ code: "custom", message: "updatedAt must be after createdAt", path: ["updatedAt"] });
    }
    if (snapshot.status === "closed" && !snapshot.closedAt) {
      context.addIssue({ code: "custom", message: "closedAt is required when status is closed", path: ["closedAt"] });
    }
    if (snapshot.status !== "closed" && snapshot.closedAt) {
      context.addIssue({ code: "custom", message: "closedAt is allowed only when status is closed", path: ["closedAt"] });
    }
  });

export const localA3ArchiveEnvelopeSchema = z
  .object({
    kind: z.literal("raport-local-a3-archive"),
    schemaVersion: z.literal(LOCAL_A3_SCHEMA_VERSION),
    exportedAt: localA3IsoDateTimeSchema,
    app: z.object({ name: z.literal("raport"), feature: z.literal("local-a3") }).strict(),
    protocols: z.array(localA3ProtocolV1Schema),
    events: z.array(localA3EventV1Schema),
    snapshots: z.array(localA3ProtocolSnapshotV1Schema),
  })
  .strict();

function formatZodIssues(error: z.ZodError): LocalA3ImportError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    message: issue.message,
  }));
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return formatZodIssues(error).map((issue) => `${issue.path}: ${issue.message}`).join("; ");
  return error instanceof Error ? error.message : "Unknown validation error";
}

export function migrateLocalA3Protocol(input: unknown): LocalA3Protocol {
  try {
    return localA3ProtocolV1Schema.parse(input);
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export function migrateLocalA3Event(input: unknown): LocalA3Event {
  try {
    return localA3EventV1Schema.parse(input);
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export function migrateLocalA3Snapshot(input: unknown): LocalA3ProtocolSnapshot {
  try {
    return localA3ProtocolSnapshotV1Schema.parse(input);
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export function parseLocalA3ArchiveEnvelope(input: unknown): LocalA3ParseResult {
  const result = localA3ArchiveEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: formatZodIssues(result.error) };
  }

  const protocolIds = new Set(result.data.protocols.map((protocol) => protocol.id));
  const errors: LocalA3ImportError[] = [];
  result.data.events.forEach((event, index) => {
    if (!protocolIds.has(event.protocolId)) {
      errors.push({ path: `events.${index}.protocolId`, message: `Event references missing protocol: ${event.protocolId}` });
    }
  });
  result.data.snapshots.forEach((snapshot, index) => {
    if (!protocolIds.has(snapshot.protocolId)) {
      errors.push({ path: `snapshots.${index}.protocolId`, message: `Snapshot references missing protocol: ${snapshot.protocolId}` });
    }
  });

  if (errors.length > 0) return { success: false, errors };
  return { success: true, archive: result.data, errors: [] };
}

export function assertLocalA3ArchiveEnvelope(input: unknown): LocalA3ArchiveEnvelope {
  const result = parseLocalA3ArchiveEnvelope(input);
  if (!result.success) {
    throw new Error(result.errors.map((error) => `${error.path}: ${error.message}`).join("; "));
  }
  return result.archive;
}
