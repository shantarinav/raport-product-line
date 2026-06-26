import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { addLocalA3Comment, saveLocalA3Protocol, createLocalA3ProtocolDraft } from "./localA3Commands";
import { exportLocalA3JournalToJson } from "./localA3Export";
import {
  exportLocalA3JournalArchiveJson,
  exportLocalA3ProtocolArchiveJson,
  filterAndSortLocalA3JournalItems,
  importLocalA3JournalJsonSafely,
  isLocalA3Overdue,
  loadLocalA3JournalItems,
} from "./localA3Journal";
import { createLocalA3Repository } from "./localA3Repository";
import type { LocalA3Protocol } from "./localA3Types";

let dbIndex = 0;
const baseNow = "2026-06-24T10:00:00.000Z";

function repository() {
  dbIndex += 1;
  return createLocalA3Repository({ dbName: `raport_local_a3_journal_test_${dbIndex}` });
}

function protocol(id: string, overrides: Partial<LocalA3Protocol> = {}): LocalA3Protocol {
  const item = createLocalA3ProtocolDraft(
    {
      dashboardType: "print",
      dashboardTitle: "Рапорт Печать",
      periodLabel: "06.2026",
      deviationTitle: `Отклонение ${id}`,
      metricName: "Риск",
    },
    { now: () => baseNow, createId: () => id },
  );
  return {
    ...item,
    ...overrides,
    form: {
      problem: "Проблема",
      cause: "Причина перегруза процесса",
      solution: "Контрмера для снижения отклонения",
      owner: "Иван Петров",
      dueDate: "2026-06-30",
      expectedResult: "Показатель улучшен",
      checkCriteria: "Повторный замер",
      ...overrides.form,
    },
  };
}

describe("localA3Journal", () => {
  const repos: Array<ReturnType<typeof createLocalA3Repository>> = [];

  afterEach(async () => {
    await Promise.all(repos.map((repo) => repo.close()));
    repos.length = 0;
  });

  it("filters and sorts journal items", () => {
    const items = [
      { protocol: protocol("p1", { status: "open", updatedAt: "2026-06-24T10:00:00.000Z", form: { ...protocol("x").form, owner: "Анна", dueDate: "2026-07-10" } }), events: [], commentText: "" },
      { protocol: protocol("p2", { status: "closed", updatedAt: "2026-06-25T10:00:00.000Z", dashboardType: "ssz", form: { ...protocol("x").form, owner: "Борис", cause: "Комментарий мастера", dueDate: "2026-06-28" } }), events: [], commentText: "" },
    ];

    expect(filterAndSortLocalA3JournalItems(items, { status: "open", query: "", sortKey: "updatedAt", sortDirection: "desc" })).toHaveLength(1);
    expect(filterAndSortLocalA3JournalItems(items, { status: "all", query: "мастера", sortKey: "updatedAt", sortDirection: "desc" })[0]?.protocol.id).toBe("p2");
    expect(filterAndSortLocalA3JournalItems(items, { status: "all", query: "", sortKey: "dueDate", sortDirection: "asc" }).map((item) => item.protocol.id)).toEqual(["p2", "p1"]);
  });

  it("detects overdue active protocols", () => {
    expect(isLocalA3Overdue(protocol("p1", { status: "in_progress", form: { ...protocol("x").form, dueDate: "2026-06-20" } }), "2026-06-24")).toBe(true);
    expect(isLocalA3Overdue(protocol("p2", { status: "closed", form: { ...protocol("x").form, dueDate: "2026-06-20" } }), "2026-06-24")).toBe(false);
  });

  it("loads items and searches comment text", async () => {
    const repo = repository();
    repos.push(repo);
    const item = protocol("p-comment");
    await saveLocalA3Protocol(item, { repository: repo, now: () => baseNow, createId: (prefix) => `${prefix}-1` });
    await addLocalA3Comment(item.id, "Проверить причину с начальником цеха", { repository: repo, now: () => "2026-06-24T11:00:00.000Z", createId: (prefix) => `${prefix}-2` });

    const items = await loadLocalA3JournalItems(repo);
    expect(filterAndSortLocalA3JournalItems(items, { status: "all", query: "начальником", sortKey: "updatedAt", sortDirection: "desc" })).toHaveLength(1);
  });

  it("exports one protocol and full journal as archives", async () => {
    const repo = repository();
    repos.push(repo);
    const item = protocol("p-export");
    await saveLocalA3Protocol(item, { repository: repo, now: () => baseNow, createId: (prefix) => `${prefix}-1` });

    const one = await exportLocalA3ProtocolArchiveJson(item.id, repo);
    const all = await exportLocalA3JournalArchiveJson(repo);

    expect(one).toContain("raport-local-a3-archive");
    expect(one).toContain("p-export");
    expect(all).toContain("p-export");
  });

  it("imports only new protocols and reports conflicts", async () => {
    const repo = repository();
    repos.push(repo);
    const existing = protocol("p-existing", { updatedAt: "2026-06-24T10:00:00.000Z" });
    const incomingExisting = protocol("p-existing", { updatedAt: "2026-06-25T10:00:00.000Z" });
    const incomingNew = protocol("p-new", { updatedAt: "2026-06-25T10:00:00.000Z" });
    await saveLocalA3Protocol(existing, { repository: repo, now: () => baseNow, createId: (prefix) => `${prefix}-1` });

    const json = exportLocalA3JournalToJson({
      protocols: [incomingExisting, incomingNew],
      events: [],
      snapshots: [],
    });
    const result = await importLocalA3JournalJsonSafely(json, repo);

    expect(result).toMatchObject({ added: 1, updated: 0, skipped: 1, conflicts: ["p-existing"] });
    await expect(repo.getProtocol("p-existing")).resolves.toMatchObject({ updatedAt: "2026-06-24T10:00:00.000Z" });
    await expect(repo.getProtocol("p-new")).resolves.toMatchObject({ id: "p-new" });
  });

  it("returns zod errors for invalid import json", async () => {
    const repo = repository();
    repos.push(repo);
    const result = await importLocalA3JournalJsonSafely(JSON.stringify({ bad: true }), repo);

    expect(result.errors.length).toBeGreaterThan(0);
    await expect(repo.listProtocols()).resolves.toHaveLength(0);
  });
});
