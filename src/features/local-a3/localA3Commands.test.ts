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

let dbIndex = 0;
const now = () => "2026-06-24T10:00:00.000Z";
const later = () => "2026-06-24T11:00:00.000Z";
const ids = (prefix: string) => `${prefix}-1`;

function repository() {
  dbIndex += 1;
  return createLocalA3Repository({ dbName: `raport_local_a3_commands_test_${dbIndex}` });
}

function complete(protocol = createLocalA3ProtocolDraft({}, { now, createId: ids })) {
  return {
    ...protocol,
    form: {
      problem: "Р”РѕР»СЏ РѕС‚РєР»РѕРЅРµРЅРёР№ РІС‹С€Рµ С†РµР»Рё",
      cause: "РќРµС‚ РµРґРёРЅРѕРіРѕ РєРѕРЅС‚СЂРѕР»СЏ РїСЂРёС‡РёРЅС‹",
      solution: "РќР°Р·РЅР°С‡РёС‚СЊ СЂР°Р·Р±РѕСЂ Рё РїСЂРѕРІРµСЂРёС‚СЊ РєРѕРЅС‚СЂРјРµСЂСѓ",
      owner: "РРІР°РЅ РџРµС‚СЂРѕРІ",
      dueDate: "2026-06-30",
      expectedResult: "РћС‚РєР»РѕРЅРµРЅРёРµ СЃРЅРёР¶РµРЅРѕ",
      checkCriteria: "РџРѕРєР°Р·Р°С‚РµР»СЊ РІРµСЂРЅСѓР»СЃСЏ РІ С†РµР»РµРІРѕР№ РґРёР°РїР°Р·РѕРЅ",
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
        dashboardTitle: "Р Р°РїРѕСЂС‚ РџРµС‡Р°С‚СЊ",
        periodLabel: "01.06.2026 - 24.06.2026",
        deviationTitle: "Р›РёС‡РЅР°СЏ РїРµС‡Р°С‚СЊ",
        metricName: "РџРѕРґРѕР·СЂРёС‚РµР»СЊРЅС‹С… Р·Р°РґР°РЅРёР№",
        actualValue: 42,
        targetValue: 0,
        deviationScale: "42 Р·Р°РґР°РЅРёСЏ",
        sourceFileName: "paper-cut.csv",
        sourceFileHash: "hash-1",
      },
      { now, createId: ids },
    );

    expect(draft).toMatchObject({
      id: "a3-1",
      dashboardType: "print",
      dashboardTitle: "Р Р°РїРѕСЂС‚ РџРµС‡Р°С‚СЊ",
      period: { label: "01.06.2026 - 24.06.2026" },
      source: { fileName: "paper-cut.csv", reportFingerprint: "hash-1" },
      deviation: { title: "Р›РёС‡РЅР°СЏ РїРµС‡Р°С‚СЊ", metricLabel: "РџРѕРґРѕР·СЂРёС‚РµР»СЊРЅС‹С… Р·Р°РґР°РЅРёР№", fact: "42", target: "0", scale: "42 Р·Р°РґР°РЅРёСЏ" },
      form: {
        problem: "Р›РёС‡РЅР°СЏ РїРµС‡Р°С‚СЊ",
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

    const result = await addLocalA3Comment(protocol.id, "РџСЂРѕРІРµСЂРёС‚СЊ РїРѕРІС‚РѕСЂРЅРѕ С‡РµСЂРµР· РЅРµРґРµР»СЋ", {
      repository: repo,
      now: later,
      actorName: "РђРЅР°Р»РёС‚РёРє",
      createId: (prefix) => `${prefix}-comment`,
    });

    expect(result.success).toBe(true);
    const timeline = await getLocalA3Timeline(protocol.id, repo);
    expect(timeline?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "created" }),
        expect.objectContaining({
          type: "comment_added",
          payload: { type: "comment_added", comment: { id: "a3-comment-comment", text: "РџСЂРѕРІРµСЂРёС‚СЊ РїРѕРІС‚РѕСЂРЅРѕ С‡РµСЂРµР· РЅРµРґРµР»СЋ", authorName: "РђРЅР°Р»РёС‚РёРє", createdAt: later() } },
        }),
      ]),
    );
  });

  it("changes owner and due date with dedicated events", async () => {
    const repo = repository();
    repos.push(repo);
    const protocol = complete();
    await saveLocalA3Protocol(protocol, { repository: repo, now, createId: ids });

    await changeLocalA3Owner(protocol.id, "РњР°СЂРёСЏ РРІР°РЅРѕРІР°", { repository: repo, now: later, createId: (prefix) => `${prefix}-owner` });
    await changeLocalA3DueDate(protocol.id, "2026-07-05", { repository: repo, now: later, createId: (prefix) => `${prefix}-date` });

    await expect(repo.getProtocol(protocol.id)).resolves.toMatchObject({ form: { owner: "РњР°СЂРёСЏ РРІР°РЅРѕРІР°", dueDate: "2026-07-05" } });
    await expect(repo.listEvents(protocol.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "owner_changed", payload: { type: "owner_changed", from: "РРІР°РЅ РџРµС‚СЂРѕРІ", to: "РњР°СЂРёСЏ РРІР°РЅРѕРІР°" } }),
        expect.objectContaining({ type: "due_date_changed", payload: { type: "due_date_changed", from: "2026-06-30", to: "2026-07-05" } }),
      ]),
    );
  });
});

