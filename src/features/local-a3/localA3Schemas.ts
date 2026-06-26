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

function requiredMessage(maxLength: number): string {
  return `\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043f\u043e\u043b\u0435, \u043d\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 ${maxLength.toLocaleString("ru-RU")} \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432`;
}

function maxLengthMessage(maxLength: number): string {
  return `\u041d\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 ${maxLength.toLocaleString("ru-RU")} \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432`;
}

function trimString(maxLength: number) {
  return z.string().trim().min(1, { message: requiredMessage(maxLength) }).max(maxLength, { message: maxLengthMessage(maxLength) });
}

function optionalTrimString(maxLength: number) {
  return z.string().trim().max(maxLength, { message: maxLengthMessage(maxLength) }).optional();
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
export const localA3IsoDateSchema = z.string().refine(isValidDateOnly, "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u0432 \u0444\u043e\u0440\u043c\u0430\u0442\u0435 \u0413\u0413\u0413\u0413-\u041c\u041c-\u0414\u0414");
export const localA3IsoDateTimeSchema = z.string().refine(isValidIsoDateTime, "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u0438 \u0432\u0440\u0435\u043c\u044f \u0432 \u0444\u043e\u0440\u043c\u0430\u0442\u0435 ISO");

export const localA3PeriodSchema = z
  .object({
    from: localA3IsoDateSchema.optional(),
    to: localA3IsoDateSchema.optional(),
    label: trimString(120),
  })
  .strict()
  .superRefine((period, context) => {
    if (period.from && period.to && period.from > period.to) {
      context.addIssue({ code: "custom", message: "Дата начала должна быть не позже даты окончания", path: ["from"] });
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
      context.addIssue({ code: "custom", message: "Дата обновления должна быть не раньше даты создания", path: ["updatedAt"] });
    }
    if (protocol.status === "closed" && !protocol.closedAt) {
      context.addIssue({ code: "custom", message: "\u0414\u043b\u044f \u0437\u0430\u043a\u0440\u044b\u0442\u043e\u0433\u043e \u0440\u0430\u0437\u0431\u043e\u0440\u0430 \u043d\u0443\u0436\u043d\u0430 \u0434\u0430\u0442\u0430 \u0437\u0430\u043a\u0440\u044b\u0442\u0438\u044f", path: ["closedAt"] });
    }
    if (protocol.status !== "closed" && protocol.closedAt) {
      context.addIssue({ code: "custom", message: "Дата закрытия допускается только для закрытого разбора", path: ["closedAt"] });
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
      fields: z.array(z.enum(["problem", "cause", "solution", "owner", "dueDate", "expectedResult", "checkCriteria"])).min(1, { message: "Укажите хотя бы одно измененное поле" }),
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
      context.addIssue({ code: "custom", message: "Тип события не совпадает с данными события", path: ["payload", "type"] });
    }
    if (event.type === "status_changed" && event.payload.type === "status_changed" && event.payload.from === event.payload.to) {
      context.addIssue({ code: "custom", message: "Новый статус должен отличаться от прежнего", path: ["payload", "to"] });
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
    commentCount: z.number().int().min(0, { message: "Количество комментариев не может быть отрицательным" }),
    eventCount: z.number().int().min(0, { message: "Количество событий не может быть отрицательным" }),
    createdAt: localA3IsoDateTimeSchema,
    updatedAt: localA3IsoDateTimeSchema,
    closedAt: localA3IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.updatedAt < snapshot.createdAt) {
      context.addIssue({ code: "custom", message: "Дата обновления должна быть не раньше даты создания", path: ["updatedAt"] });
    }
    if (snapshot.status === "closed" && !snapshot.closedAt) {
      context.addIssue({ code: "custom", message: "\u0414\u043b\u044f \u0437\u0430\u043a\u0440\u044b\u0442\u043e\u0433\u043e \u0440\u0430\u0437\u0431\u043e\u0440\u0430 \u043d\u0443\u0436\u043d\u0430 \u0434\u0430\u0442\u0430 \u0437\u0430\u043a\u0440\u044b\u0442\u0438\u044f", path: ["closedAt"] });
    }
    if (snapshot.status !== "closed" && snapshot.closedAt) {
      context.addIssue({ code: "custom", message: "Дата закрытия допускается только для закрытого разбора", path: ["closedAt"] });
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

function localizeZodIssue(issue: z.ZodIssue): string {
  if (issue.message && /[\u0400-\u04FF]/.test(issue.message)) return issue.message;
  if (issue.code === "too_small") return "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043f\u043e\u043b\u0435";
  if (issue.code === "too_big") return "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0434\u043b\u0438\u043d\u043d\u043e\u0435";
  if (issue.code === "invalid_type") return "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u0442\u0438\u043f \u0434\u0430\u043d\u043d\u044b\u0445";
  if (issue.code === "invalid_value") return "\u041d\u0435\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435";
  return "\u041e\u0448\u0438\u0431\u043a\u0430 \u0432\u0430\u043b\u0438\u0434\u0430\u0446\u0438\u0438";
}

function formatZodIssues(error: z.ZodError): LocalA3ImportError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    message: localizeZodIssue(issue),
  }));
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return formatZodIssues(error).map((issue) => `${issue.path}: ${issue.message}`).join("; ");
  return error instanceof Error ? error.message : "\u041e\u0448\u0438\u0431\u043a\u0430 \u0432\u0430\u043b\u0438\u0434\u0430\u0446\u0438\u0438";
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
      errors.push({ path: `events.${index}.protocolId`, message: `Событие ссылается на отсутствующий A3-протокол: ${event.protocolId}` });
    }
  });
  result.data.snapshots.forEach((snapshot, index) => {
    if (!protocolIds.has(snapshot.protocolId)) {
      errors.push({ path: `snapshots.${index}.protocolId`, message: `Снимок ссылается на отсутствующий A3-протокол: ${snapshot.protocolId}` });
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
