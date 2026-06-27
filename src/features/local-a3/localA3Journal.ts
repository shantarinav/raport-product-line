import { buildLocalA3ArchiveEnvelope, exportLocalA3JournalToJson, importLocalA3JournalFromJson } from "./localA3Export";
import { localA3Repository, type LocalA3Repository } from "./localA3Repository";
import type { LocalA3ArchiveEnvelope, LocalA3Event, LocalA3ImportError, LocalA3ImportResult, LocalA3Protocol, LocalA3Status } from "./localA3Types";

export type LocalA3StatusFilter = LocalA3Status | "all";
export type LocalA3SortKey = "updatedAt" | "dueDate" | "status" | "dashboardType";
export type LocalA3SortDirection = "asc" | "desc";

export type LocalA3JournalItem = {
  protocol: LocalA3Protocol;
  events: LocalA3Event[];
  commentText: string;
};

export type LocalA3JournalFilters = {
  status: LocalA3StatusFilter;
  query: string;
  sortKey: LocalA3SortKey;
  sortDirection: LocalA3SortDirection;
};

export type LocalA3SafeImportResult = LocalA3ImportResult & {
  conflicts: string[];
};

const STATUS_ORDER: Record<LocalA3Status, number> = {
  open: 1,
  in_progress: 2,
  waiting_review: 3,
  closed: 4,
  cancelled: 5,
};

function compareText(left: string | undefined, right: string | undefined): number {
  return (left ?? "").localeCompare(right ?? "", "ru");
}

function compareOptionalDate(left: string | undefined, right: string | undefined): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

function applyDirection(value: number, direction: LocalA3SortDirection): number {
  return direction === "asc" ? value : -value;
}

function searchableText(item: LocalA3JournalItem): string {
  const comments = item.events
    .filter((event) => event.type === "comment_added" && event.payload.type === "comment_added")
    .map((event) => (event.payload.type === "comment_added" ? event.payload.comment.text : ""));
  return [
    item.protocol.deviation.title,
    item.protocol.deviation.metricLabel,
    item.protocol.dashboardTitle,
    item.protocol.period.label,
    item.protocol.form.owner,
    item.protocol.form.cause,
    item.protocol.form.solution,
    ...comments,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
}

export async function loadLocalA3JournalItems(repository: LocalA3Repository = localA3Repository): Promise<LocalA3JournalItem[]> {
  const protocols = await repository.listProtocols();
  const eventsByProtocol = (await repository.listAllEvents()).reduce<Map<string, LocalA3Event[]>>((acc, event) => {
    const list = acc.get(event.protocolId) ?? [];
    list.push(event);
    acc.set(event.protocolId, list);
    return acc;
  }, new Map());

  return protocols.map((protocol) => {
    const events = eventsByProtocol.get(protocol.id) ?? [];
    const commentText = events
      .filter((event) => event.type === "comment_added" && event.payload.type === "comment_added")
      .map((event) => (event.payload.type === "comment_added" ? event.payload.comment.text : ""))
      .join(" ");
    return { protocol, events, commentText };
  });
}

export function isLocalA3Overdue(protocol: LocalA3Protocol, todayIso = new Date().toISOString().slice(0, 10)): boolean {
  if (!protocol.form.dueDate) return false;
  if (protocol.status === "closed" || protocol.status === "cancelled") return false;
  return protocol.form.dueDate < todayIso;
}

export function filterAndSortLocalA3JournalItems(items: LocalA3JournalItem[], filters: LocalA3JournalFilters): LocalA3JournalItem[] {
  const query = filters.query.trim().toLocaleLowerCase("ru-RU");
  return items
    .filter((item) => filters.status === "all" || item.protocol.status === filters.status)
    .filter((item) => !query || searchableText(item).includes(query))
    .sort((left, right) => {
      const value = (() => {
        if (filters.sortKey === "dueDate") return compareOptionalDate(left.protocol.form.dueDate, right.protocol.form.dueDate);
        if (filters.sortKey === "status") return STATUS_ORDER[left.protocol.status] - STATUS_ORDER[right.protocol.status];
        if (filters.sortKey === "dashboardType") return compareText(left.protocol.dashboardType, right.protocol.dashboardType);
        return compareText(left.protocol.updatedAt, right.protocol.updatedAt);
      })();
      return applyDirection(value, filters.sortDirection);
    });
}

export async function exportLocalA3ProtocolArchiveJson(protocolId: string, repository: LocalA3Repository = localA3Repository): Promise<string | null> {
  const protocol = await repository.getProtocol(protocolId);
  if (!protocol) return null;
  const events = await repository.listEvents(protocolId);
  const snapshots = (await repository.listSnapshots()).filter((snapshot) => snapshot.protocolId === protocolId);
  return exportLocalA3JournalToJson({ protocols: [protocol], events, snapshots });
}

export async function exportLocalA3JournalArchiveJson(repository: LocalA3Repository = localA3Repository): Promise<string> {
  const archive = await repository.exportArchive();
  return JSON.stringify(archive, null, 2);
}

function onlyAcceptedArchive(archive: LocalA3ArchiveEnvelope, acceptedIds: Set<string>): LocalA3ArchiveEnvelope {
  return buildLocalA3ArchiveEnvelope({
    protocols: archive.protocols.filter((protocol) => acceptedIds.has(protocol.id)),
    events: archive.events.filter((event) => acceptedIds.has(event.protocolId)),
    snapshots: archive.snapshots.filter((snapshot) => acceptedIds.has(snapshot.protocolId)),
  });
}

export async function importLocalA3JournalJsonSafely(json: string, repository: LocalA3Repository = localA3Repository): Promise<LocalA3SafeImportResult> {
  const parsed = importLocalA3JournalFromJson(json);
  if (!parsed.success) return { added: 0, updated: 0, skipped: 0, errors: parsed.errors, conflicts: [] };

  const existingIds = new Set((await repository.listProtocols()).map((protocol) => protocol.id));
  const conflicts = parsed.archive.protocols.filter((protocol) => existingIds.has(protocol.id)).map((protocol) => protocol.id);
  const acceptedIds = new Set(parsed.archive.protocols.filter((protocol) => !existingIds.has(protocol.id)).map((protocol) => protocol.id));

  if (acceptedIds.size === 0) {
    return { added: 0, updated: 0, skipped: conflicts.length, errors: [], conflicts };
  }

  const result = await repository.importArchive(onlyAcceptedArchive(parsed.archive, acceptedIds));
  const errors: LocalA3ImportError[] = result.errors;
  return { ...result, updated: 0, skipped: result.skipped + conflicts.length, errors, conflicts };
}
