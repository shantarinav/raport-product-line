import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalA3Repository } from "./localA3Repository";
import type { LocalA3Protocol } from "./localA3Types";

function protocol(id: string, status: LocalA3Protocol["status"], updatedAt: string): LocalA3Protocol {
  return {
    schemaVersion: 1,
    id,
    status,
    dashboardType: "support",
    dashboardTitle: "Техподдержка",
    period: { label: "06.2026" },
    source: {},
    deviation: { title: "SLA ниже цели" },
    form: {
      problem: "SLA ниже цели",
      cause: "Не хватает маршрутизации",
      solution: "Разобрать очередь заявок",
      owner: "ИТ",
      expectedResult: "SLA выше цели",
      checkCriteria: "SLA выше 80%",
    },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt,
    ...(status === "closed" ? { closedAt: updatedAt } : {}),
  };
}

const dbNames: string[] = [];

function repository() {
  const dbName = `raport-local-a3-test-${crypto.randomUUID()}`;
  dbNames.push(dbName);
  return createLocalA3Repository({ dbName });
}

afterEach(async () => {
  await Promise.all(dbNames.splice(0).map((dbName) => indexedDB.deleteDatabase(dbName)));
});

describe("localA3Repository", () => {
  it("stores and lists protocols sorted by updatedAt descending", async () => {
    const repo = repository();

    await repo.putProtocol(protocol("old", "open", "2026-06-10T00:00:00.000Z"));
    await repo.putProtocol(protocol("new", "in_progress", "2026-06-12T00:00:00.000Z"));

    await expect(repo.getProtocol("old")).resolves.toMatchObject({ id: "old" });
    await expect(repo.listProtocols()).resolves.toMatchObject([{ id: "new" }, { id: "old" }]);
    await repo.close();
  });

  it("stores events and snapshots in separate local stores", async () => {
    const repo = repository();
    const item = protocol("p1", "open", "2026-06-10T00:00:00.000Z");

    await repo.putProtocol(item);
    await repo.putEvent({
      schemaVersion: 1,
      id: "e1",
      protocolId: "p1",
      type: "comment_added",
      createdAt: "2026-06-10T01:00:00.000Z",
      payload: { type: "comment_added", comment: { id: "c1", text: "Комментарий", createdAt: "2026-06-10T01:00:00.000Z" } },
    });
    await repo.putSnapshot({
      schemaVersion: 1,
      id: "s1",
      protocolId: "p1",
      status: "open",
      dashboardType: "support",
      title: "SLA ниже цели",
      periodLabel: "06.2026",
      deviationTitle: "SLA ниже цели",
      commentCount: 1,
      eventCount: 1,
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-10T01:00:00.000Z",
    });

    await expect(repo.listEvents("p1")).resolves.toHaveLength(1);
    await expect(repo.listSnapshots()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ protocolId: "p1", commentCount: 1 })]));
    await repo.close();
  });



  it("maintains lightweight snapshots when protocols and comments change", async () => {
    const repo = repository();
    const item = protocol("p-snapshot", "open", "2026-06-10T00:00:00.000Z");

    await repo.putProtocol(item);
    await expect(repo.listSnapshots()).resolves.toMatchObject([
      { protocolId: "p-snapshot", title: "SLA ниже цели", commentCount: 0, eventCount: 0 },
    ]);

    await repo.putEvent({
      schemaVersion: 1,
      id: "e-comment",
      protocolId: "p-snapshot",
      type: "comment_added",
      createdAt: "2026-06-10T01:00:00.000Z",
      payload: { type: "comment_added", comment: { id: "c-comment", text: "Комментарий", createdAt: "2026-06-10T01:00:00.000Z" } },
    });

    await expect(repo.listSnapshots()).resolves.toMatchObject([
      { protocolId: "p-snapshot", commentCount: 1, eventCount: 1, updatedAt: "2026-06-10T01:00:00.000Z" },
    ]);
    await repo.close();
  });

  it("imports archive with validation and newer-record merge", async () => {
    const repo = repository();
    await repo.putProtocol(protocol("p1", "open", "2026-06-10T00:00:00.000Z"));

    const result = await repo.importArchive({
      kind: "raport-local-a3-archive",
      schemaVersion: 1,
      exportedAt: "2026-06-12T00:00:00.000Z",
      app: { name: "raport", feature: "local-a3" },
      protocols: [protocol("p1", "in_progress", "2026-06-12T00:00:00.000Z"), protocol("p2", "open", "2026-06-11T00:00:00.000Z")],
      events: [],
      snapshots: [],
    });

    expect(result).toMatchObject({ added: 1, updated: 1, skipped: 0, errors: [] });
    await expect(repo.listProtocols()).resolves.toMatchObject([{ id: "p1", status: "in_progress" }, { id: "p2" }]);
    await repo.close();
  });

  it("rejects events and snapshots for missing protocols", async () => {
    const repo = repository();

    await expect(repo.putEvent({
      schemaVersion: 1,
      id: "orphan-event",
      protocolId: "missing",
      type: "created",
      createdAt: "2026-06-10T01:00:00.000Z",
      payload: { type: "created" },
    })).rejects.toThrow(/protocol/i);

    await expect(repo.putSnapshot({
      schemaVersion: 1,
      id: "orphan-snapshot",
      protocolId: "missing",
      status: "open",
      dashboardType: "support",
      title: "SLA ниже цели",
      periodLabel: "06.2026",
      deviationTitle: "SLA ниже цели",
      commentCount: 0,
      eventCount: 0,
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z",
    })).rejects.toThrow(/protocol/i);

    await expect(repo.listEvents("missing")).resolves.toEqual([]);
    await expect(repo.listSnapshots()).resolves.toEqual([]);
    await repo.close();
  });

  it("migrates a version 1 Local A3 database to snapshots store", async () => {
    const dbName = `raport-local-a3-test-migration-${crypto.randomUUID()}`;
    dbNames.push(dbName);
    const legacy = await import("dexie");
    const legacyDb = new legacy.default(dbName);
    legacyDb.version(1).stores({
      protocols: "id,status,dashboardType,updatedAt,createdAt,form.dueDate",
      events: "id,protocolId,createdAt,type",
    });
    await legacyDb.table("protocols").put(protocol("legacy", "open", "2026-06-10T00:00:00.000Z"));
    legacyDb.close();

    const repo = createLocalA3Repository({ dbName });
    await expect(repo.getProtocol("legacy")).resolves.toMatchObject({ id: "legacy" });
    await expect(repo.listSnapshots()).resolves.toEqual([]);
    await repo.putEvent({
      schemaVersion: 1,
      id: "legacy-event",
      protocolId: "legacy",
      type: "created",
      createdAt: "2026-06-10T01:00:00.000Z",
      payload: { type: "created" },
    });
    await expect(repo.listSnapshots()).resolves.toMatchObject([{ protocolId: "legacy", eventCount: 1 }]);
    await repo.close();
  });

  it("does not persist invalid imported records", async () => {
    const repo = repository();
    const result = await repo.importUnknown({ protocols: [{ id: "bad", schemaVersion: 1, status: "wrong" }] });

    expect(result.added).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    await expect(repo.listProtocols()).resolves.toEqual([]);
    await repo.close();
  });
});

