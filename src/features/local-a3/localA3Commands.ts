import { localA3ProtocolV1Schema } from "./localA3Schemas";
import { localA3Repository, type LocalA3Repository } from "./localA3Repository";
import {
  LOCAL_A3_SCHEMA_VERSION,
  type LocalA3DashboardType,
  type LocalA3Event,
  type LocalA3Form,
  type LocalA3Period,
  type LocalA3Protocol,
  type LocalA3Source,
  type LocalA3Status,
} from "./localA3Types";

export type LocalA3DraftInput = {
  dashboardType?: LocalA3DashboardType;
  dashboardTitle?: string;
  periodLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  deviationTitle?: string;
  metricName?: string;
  actualValue?: string | number;
  targetValue?: string | number;
  deviationScale?: string | number;
  sourceFileName?: string;
  sourceFileHash?: string;
  affectedObjectType?: string;
  affectedObjectId?: string;
  affectedObjectName?: string;
  evidenceSummary?: string;
  createdFromDashboardAt?: string;
};

export type LocalA3CommandContext = {
  repository?: LocalA3Repository;
  actorName?: string;
  now?: () => string;
  createId?: (prefix: string) => string;
};

export type LocalA3ValidationIssue = {
  path: string;
  message: string;
};

export type LocalA3SaveResult =
  | { success: true; protocol: LocalA3Protocol; events: LocalA3Event[] }
  | { success: false; errors: LocalA3ValidationIssue[] };

const EMPTY_FORM: LocalA3Form = {
  problem: "",
  cause: "",
  solution: "",
  owner: "",
  expectedResult: "",
  checkCriteria: "",
};

function buildDraftForm(input: LocalA3DraftInput): LocalA3Form {
  return {
    ...EMPTY_FORM,
    problem: textOrFallback(input.deviationTitle, ""),
    checkCriteria: input.deviationTitle ? "Повторно проверить показатель в следующем отчете." : "",
  };
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultId(prefix: string): string {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${randomId}`;
}

function valueToText(value: string | number | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function textOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function trimToLength(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function buildPeriod(input: LocalA3DraftInput): LocalA3Period {
  return {
    ...(input.periodStart ? { from: input.periodStart } : {}),
    ...(input.periodEnd ? { to: input.periodEnd } : {}),
    label: textOrFallback(input.periodLabel, input.periodStart && input.periodEnd ? `${input.periodStart} - ${input.periodEnd}` : "Период не указан"),
  };
}

function buildSource(input: LocalA3DraftInput): LocalA3Source {
  return {
    ...(input.sourceFileName ? { fileName: input.sourceFileName } : {}),
    ...(input.sourceFileHash ? { reportFingerprint: input.sourceFileHash } : {}),
  };
}

function buildDeviationContext(input: LocalA3DraftInput): string | undefined {
  const objectValue = trimToLength(input.affectedObjectId ?? input.affectedObjectName, 160);
  const objectLabel = [trimToLength(input.affectedObjectType, 40), objectValue].filter(Boolean).join(" — ");
  const contextParts = [trimToLength(input.evidenceSummary, 800), objectLabel ? `Объект: ${objectLabel}` : undefined]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return trimToLength(contextParts.join("\n"), 1000);
}

function localizeValidationMessage(message: string): string {
  return /[\u0400-\u04FF]/.test(message) ? message : "\u041e\u0448\u0438\u0431\u043a\u0430 \u0432\u0430\u043b\u0438\u0434\u0430\u0446\u0438\u0438";
}

function formatPath(path: PropertyKey[]): string {
  return path.length > 0 ? path.map(String).join(".") : "$";
}

export function validateLocalA3Protocol(protocol: LocalA3Protocol): LocalA3SaveResult {
  const result = localA3ProtocolV1Schema.safeParse(protocol);
  const dueDateError = protocol.form.dueDate ? [] : [{ path: "form.dueDate", message: "Укажите срок" }];
  if (result.success) {
    if (dueDateError.length > 0) {
      return { success: false, errors: dueDateError };
    }
    return { success: true, protocol: result.data, events: [] };
  }
  const zodErrors = result.error.issues.map((issue) => ({ path: formatPath(issue.path), message: localizeValidationMessage(issue.message) }));
  return {
    success: false,
    errors: [...zodErrors, ...dueDateError.filter((manualError) => !zodErrors.some((error) => error.path === manualError.path))],
  };
}

export function createLocalA3ProtocolDraft(input: LocalA3DraftInput = {}, context: LocalA3CommandContext = {}): LocalA3Protocol {
  const now = context.now?.() ?? input.createdFromDashboardAt ?? defaultNow();
  const deviationContext = buildDeviationContext(input);
  return {
    schemaVersion: LOCAL_A3_SCHEMA_VERSION,
    id: context.createId?.("a3") ?? defaultId("a3"),
    status: "open",
    dashboardType: input.dashboardType ?? "print",
    dashboardTitle: textOrFallback(input.dashboardTitle, "Ручной разбор"),
    period: buildPeriod(input),
    source: buildSource(input),
    deviation: {
      title: textOrFallback(input.deviationTitle, "Новое отклонение"),
      ...(input.metricName ? { metricLabel: input.metricName } : {}),
      ...(valueToText(input.actualValue) ? { fact: valueToText(input.actualValue) } : {}),
      ...(valueToText(input.targetValue) ? { target: valueToText(input.targetValue) } : {}),
      ...(valueToText(input.deviationScale) ? { scale: valueToText(input.deviationScale) } : {}),
      ...(deviationContext ? { context: deviationContext } : {}),
    },
    form: buildDraftForm(input),
    createdAt: now,
    updatedAt: now,
  };
}

function createEvent(
  protocolId: string,
  type: LocalA3Event["type"],
  payload: LocalA3Event["payload"],
  context: LocalA3CommandContext,
): LocalA3Event {
  return {
    schemaVersion: LOCAL_A3_SCHEMA_VERSION,
    id: context.createId?.("a3-event") ?? defaultId("a3-event"),
    protocolId,
    type,
    createdAt: context.now?.() ?? defaultNow(),
    ...(context.actorName ? { actorName: context.actorName } : {}),
    payload,
  };
}

function changedFormFields(previous: LocalA3Form, next: LocalA3Form): Array<keyof LocalA3Form> {
  const fields: Array<keyof LocalA3Form> = ["problem", "cause", "solution", "owner", "dueDate", "expectedResult", "checkCriteria"];
  return fields.filter((field) => (previous[field] ?? "") !== (next[field] ?? ""));
}

function applyClosedAt(protocol: LocalA3Protocol, now: string): LocalA3Protocol {
  if (protocol.status === "closed") return { ...protocol, closedAt: protocol.closedAt ?? now };
  const { closedAt: _closedAt, ...withoutClosedAt } = protocol;
  return withoutClosedAt;
}

export async function saveLocalA3Protocol(protocol: LocalA3Protocol, context: LocalA3CommandContext = {}): Promise<LocalA3SaveResult> {
  const repository = context.repository ?? localA3Repository;
  const now = context.now?.() ?? defaultNow();
  const current = await repository.getProtocol(protocol.id);
  const nextProtocol = applyClosedAt({ ...protocol, updatedAt: now }, now);
  const validation = validateLocalA3Protocol(nextProtocol);
  if (!validation.success) return validation;

  const events: LocalA3Event[] = [];
  if (!current) {
    events.push(createEvent(nextProtocol.id, "created", { type: "created" }, context));
  } else {
    if (current.status !== nextProtocol.status) {
      events.push(
        createEvent(
          nextProtocol.id,
          "status_changed",
          { type: "status_changed", from: current.status, to: nextProtocol.status },
          context,
        ),
      );
    }
    const changedFields = changedFormFields(current.form, nextProtocol.form);
    if (changedFields.length > 0) {
      events.push(createEvent(nextProtocol.id, "form_updated", { type: "form_updated", fields: changedFields }, context));
    }
  }

  await repository.putProtocolWithEvents(validation.protocol, events);
  return { success: true, protocol: validation.protocol, events };
}

export async function changeLocalA3Status(
  protocolId: string,
  status: LocalA3Status,
  context: LocalA3CommandContext = {},
): Promise<LocalA3SaveResult> {
  const repository = context.repository ?? localA3Repository;
  const protocol = await repository.getProtocol(protocolId);
  if (!protocol) return { success: false, errors: [{ path: "id", message: "A3-протокол не найден" }] };
  if (protocol.status === status) return { success: true, protocol, events: [] };
  return saveLocalA3Protocol({ ...protocol, status }, context);
}

export async function changeLocalA3Owner(
  protocolId: string,
  owner: string,
  context: LocalA3CommandContext = {},
): Promise<LocalA3SaveResult> {
  const repository = context.repository ?? localA3Repository;
  const protocol = await repository.getProtocol(protocolId);
  if (!protocol) return { success: false, errors: [{ path: "id", message: "A3-протокол не найден" }] };
  if (protocol.form.owner === owner) return { success: true, protocol, events: [] };

  const now = context.now?.() ?? defaultNow();
  const nextProtocol = { ...protocol, updatedAt: now, form: { ...protocol.form, owner } };
  const validation = validateLocalA3Protocol(nextProtocol);
  if (!validation.success) return validation;

  const event = createEvent(
    protocolId,
    "owner_changed",
    { type: "owner_changed", from: protocol.form.owner || undefined, to: owner },
    context,
  );
  await repository.putProtocolWithEvents(validation.protocol, [event]);
  return { success: true, protocol: validation.protocol, events: [event] };
}

export async function changeLocalA3DueDate(
  protocolId: string,
  dueDate: string | undefined,
  context: LocalA3CommandContext = {},
): Promise<LocalA3SaveResult> {
  const repository = context.repository ?? localA3Repository;
  const protocol = await repository.getProtocol(protocolId);
  if (!protocol) return { success: false, errors: [{ path: "id", message: "A3-протокол не найден" }] };
  if (protocol.form.dueDate === dueDate) return { success: true, protocol, events: [] };

  const now = context.now?.() ?? defaultNow();
  const nextForm = { ...protocol.form, ...(dueDate ? { dueDate } : {}) };
  if (!dueDate) delete nextForm.dueDate;
  const nextProtocol = { ...protocol, updatedAt: now, form: nextForm };
  const validation = validateLocalA3Protocol(nextProtocol);
  if (!validation.success) return validation;

  const event = createEvent(
    protocolId,
    "due_date_changed",
    { type: "due_date_changed", from: protocol.form.dueDate, to: dueDate },
    context,
  );
  await repository.putProtocolWithEvents(validation.protocol, [event]);
  return { success: true, protocol: validation.protocol, events: [event] };
}

export async function addLocalA3Comment(
  protocolId: string,
  text: string,
  context: LocalA3CommandContext = {},
): Promise<LocalA3SaveResult> {
  const repository = context.repository ?? localA3Repository;
  const protocol = await repository.getProtocol(protocolId);
  if (!protocol) return { success: false, errors: [{ path: "id", message: "A3-протокол не найден" }] };

  const now = context.now?.() ?? defaultNow();
  const event = createEvent(
    protocolId,
    "comment_added",
    {
      type: "comment_added",
      comment: {
        id: context.createId?.("a3-comment") ?? defaultId("a3-comment"),
        text,
        ...(context.actorName ? { authorName: context.actorName } : {}),
        createdAt: now,
      },
    },
    context,
  );
  const nextProtocol = { ...protocol, updatedAt: now };
  const validation = validateLocalA3Protocol(nextProtocol);
  if (!validation.success) return validation;
  await repository.putProtocolWithEvents(validation.protocol, [event]);
  return { success: true, protocol: validation.protocol, events: [event] };
}

export async function getLocalA3Timeline(protocolId: string, repository: LocalA3Repository = localA3Repository) {
  const protocol = await repository.getProtocol(protocolId);
  if (!protocol) return null;
  return { protocol, events: await repository.listEvents(protocolId) };
}
