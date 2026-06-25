import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  addLocalA3Comment,
  changeLocalA3DueDate,
  changeLocalA3Owner,
  changeLocalA3Status,
  createLocalA3ProtocolDraft,
  getLocalA3Timeline,
  saveLocalA3Protocol,
} from "./localA3Commands";
import { createLocalA3Repository } from "./localA3Repository";
import type { LocalA3Protocol } from "./localA3Types";

let dbIndex = 0;
const now = () => "2026-06-24T10:00:00.000Z";
const later = () => "2026-06-24T11:00:00.000Z";
const ids = (prefix: string) => `${prefix}-1`;

function repository() {
  dbIndex += 1;
  return createLocalA3Repository({ dbName: `raport_local_a3_commands_test_${dbIndex}` });
}

function complete(protocol = createLocalA3ProtocolDraft({}, { now, createId: ids })): LocalA3Protocol {
  return {
    ...protocol,
    form: {
      problem: "Доля отклонений выше цели",
      cause: "Нет единого контроля причины",
      solution: "Назначить разбор и проверить контрмеру",
      owner: "Иван Петров",
      dueDate: "2026-06-30",
      expectedResult: "Отклонение снижено",
      checkCriteria: "Показатель вернулся в целевой диапазон",
    },
  };
}

describe("localA3Commands", () => {
  const repos: Array<ReturnType<typeof createLocalA3Repository>> = [];

  afterEach(async () => {
    await Promise.all(repos.map((repo) => repo.close()));
    repos.length = 0;
  });

  it("creates a draft protocol from dashboard context", () => {
    const draft = createLocalA3ProtocolDraft(
      {
        dashboardType: "print",
        dashboardTitle: "Рапорт Печать",
        periodLabel: "01.06.2026 - 24.06.2026",
        deviationTitle: "Личная печать",
        metricName: "Подозрительных заданий",
        actualValue: 42,
        targetValue: 0,
        deviationScale: "42 задания",
        sourceFileName: "paper-cut.csv",
        sourceFileHash: "hash-1",
      },
      { now, createId: ids },
    );

    expect(draft).toMatchObject({
      id: "a3-1",
      dashboardType: "print",
      dashboardTitle: "Рапорт Печать",
      period: { label: "01.06.2026 - 24.06.2026" },
      source: { fileName: "paper-cut.csv", reportFingerprint: "hash-1" },
      deviation: { title: "Личная печать", metricLabel: "Подозрительных заданий", fact: "42", target: "0", scale: "42 задания" },
      form: {
        problem: "Личная печать",
        checkCriteria: "Повторно проверить показатель в следующем отчете.",
      },
    });
  });


  it("keeps only bounded dashboard evidence in draft context", () => {
    const longEvidence = `Цех: 26 174 н-ч без технологии. ${"повтор ".repeat(200)}`;
    const draft = createLocalA3ProtocolDraft(
      {
        dashboardType: "ssz",
        dashboardTitle: "ССЗ: качество оформления",
        deviationTitle: "Доля работ по технологии ниже цели",
        metricName: "Доля работ по технологии",
        actualValue: "15,6%",
        targetValue: "70%",
        deviationScale: "отклонение: 54,4 п.п.",
        affectedObjectType: "department",
        affectedObjectName: `400 ${"очень длинное название ".repeat(20)}`,
        evidenceSummary: longEvidence,
      },
      { now, createId: ids },
    );

    expect(draft.deviation.context).toContain("Цех: 26 174 н-ч без технологии");
    expect(draft.deviation.context).toContain("Объект: department — 400");
    expect(draft.deviation.context?.length).toBeLessThanOrEqual(1000);
    expect(draft.deviation.context).not.toContain("sszRecords");
    expect(draft.deviation.context).not.toContain("operations");
  });

  it("does not persist invalid editor data", async () => {
    const repo = repository();
    repos.push(repo);
    const invalid = createLocalA3ProtocolDraft({}, { now, createId: ids });

    const result = await saveLocalA3Protocol(invalid, { repository: repo, now, createId: ids });

    expect(result.success).toBe(false);
    await expect(repo.listProtocols()).resolves.toHaveLength(0);
  });

  it("does not persist due date in mm.dd.yyyy format", async () => {
    const repo = repository();
    repos.push(repo);
    const invalid = complete();
    invalid.form.dueDate = "06.30.2026";

    const result = await saveLocalA3Protocol(invalid, { repository: repo, now, createId: ids });

    expect(result.success).toBe(false);
    await expect(repo.listProtocols()).resolves.toHaveLength(0);
  });

  it("does not persist a protocol without due date", async () => {
    const repo = repository();
    repos.push(repo);
    const invalid = complete();
    const { dueDate: _dueDate, ...formWithoutDueDate } = invalid.form;
    invalid.form = formWithoutDueDate;

    const result = await saveLocalA3Protocol(invalid, { repository: repo, now, createId: ids });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: "form.dueDate" })]));
    }
    await expect(repo.listProtocols()).resolves.toHaveLength(0);
  });

  it("returns owner and due date errors together", async () => {
    const repo = repository();
    repos.push(repo);
    const invalid = complete();
    invalid.form.owner = "";
    const { dueDate: _dueDate, ...formWithoutDueDate } = invalid.form;
    invalid.form = formWithoutDueDate;

    const result = await saveLocalA3Protocol(invalid, { repository: repo, now, createId: ids });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "form.owner" }),
        expect.objectContaining({ path: "form.dueDate" }),
      ]));
    }
  });

  it("saves a valid protocol and writes a created event", async () => {
    const repo = repository();
    repos.push(repo);
    const protocol = complete();

    const result = await saveLocalA3Protocol(protocol, { repository: repo, now, createId: ids });

    expect(result.success).toBe(true);
    await expect(repo.listProtocols()).resolves.toHaveLength(1);
    await expect(repo.listEvents(protocol.id)).resolves.toMatchObject([{ type: "created" }]);
  });

  it("changes status and writes a status event", async () => {
    const repo = repository();
    repos.push(repo);
    const protocol = complete();
    await saveLocalA3Protocol(protocol, { repository: repo, now, createId: ids });

    const result = await changeLocalA3Status(protocol.id, "waiting_review", { repository: repo, now: later, createId: (prefix) => `${prefix}-2` });

    expect(result.success).toBe(true);
    await expect(repo.getProtocol(protocol.id)).resolves.toMatchObject({ status: "waiting_review" });
    await expect(repo.listEvents(protocol.id)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "status_changed", payload: { type: "status_changed", from: "open", to: "waiting_review" } })]),
    );
  });

  it("adds a comment event and returns timeline", async () => {
    const repo = repository();
    repos.push(repo);
    const protocol = complete();
    await saveLocalA3Protocol(protocol, { repository: repo, now, createId: ids });

    const result = await addLocalA3Comment(protocol.id, "Проверить повторно через неделю", {
      repository: repo,
      now: later,
      actorName: "Аналитик",
      createId: (prefix) => `${prefix}-comment`,
    });

    expect(result.success).toBe(true);
    const timeline = await getLocalA3Timeline(protocol.id, repo);
    expect(timeline?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "created" }),
        expect.objectContaining({
          type: "comment_added",
          payload: { type: "comment_added", comment: { id: "a3-comment-comment", text: "Проверить повторно через неделю", authorName: "Аналитик", createdAt: later() } },
        }),
      ]),
    );
  });

  it("changes owner and due date with dedicated events", async () => {
    const repo = repository();
    repos.push(repo);
    const protocol = complete();
    await saveLocalA3Protocol(protocol, { repository: repo, now, createId: ids });

    await changeLocalA3Owner(protocol.id, "Мария Иванова", { repository: repo, now: later, createId: (prefix) => `${prefix}-owner` });
    await changeLocalA3DueDate(protocol.id, "2026-07-05", { repository: repo, now: later, createId: (prefix) => `${prefix}-date` });

    await expect(repo.getProtocol(protocol.id)).resolves.toMatchObject({ form: { owner: "Мария Иванова", dueDate: "2026-07-05" } });
    await expect(repo.listEvents(protocol.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "owner_changed", payload: { type: "owner_changed", from: "Иван Петров", to: "Мария Иванова" } }),
        expect.objectContaining({ type: "due_date_changed", payload: { type: "due_date_changed", from: "2026-06-30", to: "2026-07-05" } }),
      ]),
    );
  });
});
