import { assertLocalA3ArchiveEnvelope, migrateLocalA3Protocol, parseLocalA3ArchiveEnvelope } from "./localA3Schemas";
import {
  LOCAL_A3_SCHEMA_VERSION,
  type LocalA3ArchiveEnvelope,
  type LocalA3Event,
  type LocalA3ImportError,
  type LocalA3MergeResult,
  type LocalA3ParseResult,
  type LocalA3Protocol,
  type LocalA3ProtocolSnapshot,
} from "./localA3Types";

type ArchiveParts = {
  protocols: LocalA3Protocol[];
  events: LocalA3Event[];
  snapshots: LocalA3ProtocolSnapshot[];
};

export function buildLocalA3ArchiveEnvelope(parts: ArchiveParts, exportedAt = new Date().toISOString()): LocalA3ArchiveEnvelope {
  return assertLocalA3ArchiveEnvelope({
    kind: "raport-local-a3-archive",
    schemaVersion: LOCAL_A3_SCHEMA_VERSION,
    exportedAt,
    app: { name: "raport", feature: "local-a3" },
    protocols: parts.protocols,
    events: parts.events,
    snapshots: parts.snapshots,
  });
}

export function exportLocalA3JournalToJson(parts: ArchiveParts): string {
  return JSON.stringify(buildLocalA3ArchiveEnvelope(parts), null, 2);
}

export function exportLocalA3ProtocolToJson(protocol: LocalA3Protocol): string {
  return JSON.stringify(migrateLocalA3Protocol(protocol), null, 2);
}

export function importLocalA3JournalFromJson(json: string): LocalA3ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      success: false,
      errors: [{ path: "$", message: error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON" }],
    };
  }

  const archiveResult = parseLocalA3ArchiveEnvelope(parsed);
  if (archiveResult.success) return archiveResult;

  try {
    const protocol = migrateLocalA3Protocol(parsed);
    return {
      success: true,
      archive: buildLocalA3ArchiveEnvelope({ protocols: [protocol], events: [], snapshots: [] }),
      errors: [],
    };
  } catch {
    return archiveResult;
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function mergeByUpdatedAt(existing: LocalA3Protocol[], incoming: LocalA3Protocol[]) {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const byId = new Map(existing.map((protocol) => [protocol.id, protocol]));

  incoming.forEach((protocol) => {
    const current = byId.get(protocol.id);
    if (!current) {
      added += 1;
      byId.set(protocol.id, protocol);
      return;
    }
    if (protocol.updatedAt > current.updatedAt) {
      updated += 1;
      byId.set(protocol.id, protocol);
      return;
    }
    skipped += 1;
  });

  return { protocols: Array.from(byId.values()), added, updated, skipped };
}

export function mergeLocalA3Archive(existing: LocalA3ArchiveEnvelope, incoming: LocalA3ArchiveEnvelope): LocalA3MergeResult {
  const protocolMerge = mergeByUpdatedAt(existing.protocols, incoming.protocols);
  const events = uniqueById([...existing.events, ...incoming.events]);
  const snapshots = uniqueById([...existing.snapshots, ...incoming.snapshots]);
  const archive = buildLocalA3ArchiveEnvelope({
    protocols: protocolMerge.protocols,
    events,
    snapshots,
  }, new Date().toISOString());

  return {
    archive,
    added: protocolMerge.added,
    updated: protocolMerge.updated,
    skipped: protocolMerge.skipped,
    errors: [],
  };
}

export function errorsFromParse(result: LocalA3ParseResult): LocalA3ImportError[] {
  return result.success ? [] : result.errors;
}
