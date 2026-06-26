import Dexie, { type EntityTable } from "dexie";
import { buildLocalA3ArchiveEnvelope } from "./localA3Export";
import {
  assertLocalA3ArchiveEnvelope,
  migrateLocalA3Event,
  migrateLocalA3Protocol,
  migrateLocalA3Snapshot,
  parseLocalA3ArchiveEnvelope,
} from "./localA3Schemas";
import type {
  LocalA3ArchiveEnvelope,
  LocalA3Event,
  LocalA3ImportResult,
  LocalA3Protocol,
  LocalA3ProtocolSnapshot,
} from "./localA3Types";

const DEFAULT_DB_NAME = "raport_local_a3";

class LocalA3DexieDatabase extends Dexie {
  protocols!: EntityTable<LocalA3Protocol, "id">;
  events!: EntityTable<LocalA3Event, "id">;
  snapshots!: EntityTable<LocalA3ProtocolSnapshot, "id">;

  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      protocols: "id,status,dashboardType,updatedAt,createdAt,form.dueDate",
      events: "id,protocolId,createdAt,type",
    });
    this.version(2).stores({
      protocols: "id,status,dashboardType,updatedAt,createdAt,form.dueDate",
      events: "id,protocolId,createdAt,type",
      snapshots: "id,protocolId,status,dashboardType,updatedAt,createdAt,dueDate",
    });
  }
}

export type LocalA3RepositoryOptions = {
  dbName?: string;
};

export type LocalA3Repository = ReturnType<typeof createLocalA3Repository>;

function byUpdatedAtDesc(left: LocalA3Protocol, right: LocalA3Protocol): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function snapshotByUpdatedAtDesc(left: LocalA3ProtocolSnapshot, right: LocalA3ProtocolSnapshot): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function latestTimestamp(protocol: LocalA3Protocol, events: LocalA3Event[]): string {
  return events.reduce((latest, event) => (event.createdAt > latest ? event.createdAt : latest), protocol.updatedAt);
}

function buildProtocolSnapshot(protocol: LocalA3Protocol, events: LocalA3Event[]): LocalA3ProtocolSnapshot {
  return migrateLocalA3Snapshot({
    schemaVersion: 1,
    id: `snapshot::${protocol.id}`,
    protocolId: protocol.id,
    status: protocol.status,
    dashboardType: protocol.dashboardType,
    title: protocol.deviation.title,
    owner: protocol.form.owner,
    dueDate: protocol.form.dueDate,
    periodLabel: protocol.period.label,
    deviationTitle: protocol.deviation.title,
    metricLabel: protocol.deviation.metricLabel,
    commentCount: events.filter((event) => event.type === "comment_added").length,
    eventCount: events.length,
    createdAt: protocol.createdAt,
    updatedAt: latestTimestamp(protocol, events),
    ...(protocol.closedAt ? { closedAt: protocol.closedAt } : {}),
  });
}

async function upsertProtocolSnapshot(db: LocalA3DexieDatabase, protocol: LocalA3Protocol): Promise<void> {
  const events = (await db.events.where("protocolId").equals(protocol.id).toArray()).map(migrateLocalA3Event);
  await db.snapshots.put(buildProtocolSnapshot(protocol, events));
}

export function createLocalA3Repository(options: LocalA3RepositoryOptions = {}) {
  const db = new LocalA3DexieDatabase(options.dbName ?? DEFAULT_DB_NAME);

  return {
    async putProtocol(protocol: LocalA3Protocol): Promise<void> {
      const parsedProtocol = migrateLocalA3Protocol(protocol);
      await db.transaction("rw", db.protocols, db.events, db.snapshots, async () => {
        await db.protocols.put(parsedProtocol);
        await upsertProtocolSnapshot(db, parsedProtocol);
      });
    },

    async putProtocolWithEvents(protocol: LocalA3Protocol, events: LocalA3Event[]): Promise<void> {
      const parsedProtocol = migrateLocalA3Protocol(protocol);
      const parsedEvents = events.map(migrateLocalA3Event);
      const invalidEvent = parsedEvents.find((event) => event.protocolId !== parsedProtocol.id);
      if (invalidEvent) throw new Error(`A3 event does not belong to protocol: ${invalidEvent.id}`);

      await db.transaction("rw", db.protocols, db.events, db.snapshots, async () => {
        await db.protocols.put(parsedProtocol);
        for (const event of parsedEvents) {
          await db.events.put(event);
        }
        await upsertProtocolSnapshot(db, parsedProtocol);
      });
    },

    async getProtocol(id: string): Promise<LocalA3Protocol | null> {
      const protocol = await db.protocols.get(id);
      return protocol ? migrateLocalA3Protocol(protocol) : null;
    },

    async listProtocols(): Promise<LocalA3Protocol[]> {
      const protocols = await db.protocols.toArray();
      return protocols.map(migrateLocalA3Protocol).sort(byUpdatedAtDesc);
    },

    async deleteProtocol(id: string): Promise<void> {
      await db.transaction("rw", db.protocols, db.events, db.snapshots, async () => {
        await db.protocols.delete(id);
        await db.events.where("protocolId").equals(id).delete();
        await db.snapshots.where("protocolId").equals(id).delete();
      });
    },

    async putEvent(event: LocalA3Event): Promise<void> {
      const parsedEvent = migrateLocalA3Event(event);
      await db.transaction("rw", db.protocols, db.events, db.snapshots, async () => {
        const protocol = await db.protocols.get(parsedEvent.protocolId);
        if (!protocol) throw new Error(`A3 protocol not found for event: ${parsedEvent.protocolId}`);
        await db.events.put(parsedEvent);
        await upsertProtocolSnapshot(db, migrateLocalA3Protocol(protocol));
      });
    },

    async listEvents(protocolId: string): Promise<LocalA3Event[]> {
      const events = await db.events.where("protocolId").equals(protocolId).toArray();
      return events.map(migrateLocalA3Event).sort((left, right) => {
        const dateCompare = left.createdAt.localeCompare(right.createdAt);
        return dateCompare !== 0 ? dateCompare : left.id.localeCompare(right.id);
      });
    },

    async putSnapshot(snapshot: LocalA3ProtocolSnapshot): Promise<void> {
      const parsedSnapshot = migrateLocalA3Snapshot(snapshot);
      await db.transaction("rw", db.protocols, db.snapshots, async () => {
        const protocol = await db.protocols.get(parsedSnapshot.protocolId);
        if (!protocol) throw new Error(`A3 protocol not found for snapshot: ${parsedSnapshot.protocolId}`);
        await db.snapshots.put(parsedSnapshot);
      });
    },

    async listSnapshots(): Promise<LocalA3ProtocolSnapshot[]> {
      const snapshots = await db.snapshots.toArray();
      return snapshots.map(migrateLocalA3Snapshot).sort(snapshotByUpdatedAtDesc);
    },

    async importArchive(archive: LocalA3ArchiveEnvelope): Promise<LocalA3ImportResult> {
      const parsedArchive = assertLocalA3ArchiveEnvelope(archive);
      let added = 0;
      let updated = 0;
      let skipped = 0;

      await db.transaction("rw", db.protocols, db.events, db.snapshots, async () => {
        for (const protocol of parsedArchive.protocols) {
          const existing = await db.protocols.get(protocol.id);
          if (!existing) {
            added += 1;
            await db.protocols.put(protocol);
            continue;
          }
          if (protocol.updatedAt > existing.updatedAt) {
            updated += 1;
            await db.protocols.put(protocol);
            continue;
          }
          skipped += 1;
        }

        for (const event of parsedArchive.events) {
          const existing = await db.events.get(event.id);
          if (!existing) await db.events.put(event);
        }

        for (const snapshot of parsedArchive.snapshots) {
          const existing = await db.snapshots.get(snapshot.id);
          if (!existing || snapshot.updatedAt > existing.updatedAt) await db.snapshots.put(snapshot);
        }

        for (const protocol of parsedArchive.protocols) {
          const storedProtocol = await db.protocols.get(protocol.id);
          if (storedProtocol) await upsertProtocolSnapshot(db, migrateLocalA3Protocol(storedProtocol));
        }
      });

      return { added, updated, skipped, errors: [] };
    },

    async importUnknown(input: unknown): Promise<LocalA3ImportResult> {
      const result = parseLocalA3ArchiveEnvelope(input);
      if (!result.success) {
        return { added: 0, updated: 0, skipped: 0, errors: result.errors };
      }
      return this.importArchive(result.archive);
    },

    async exportArchive(): Promise<LocalA3ArchiveEnvelope> {
      return buildLocalA3ArchiveEnvelope({
        protocols: await this.listProtocols(),
        events: (await db.events.toArray()).map(migrateLocalA3Event),
        snapshots: await this.listSnapshots(),
      });
    },

    async close(): Promise<void> {
      db.close();
    },
  };
}

export const localA3Repository = createLocalA3Repository();
