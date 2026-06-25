import { describe, expect, it } from "vitest";
import {
  localA3ArchiveEnvelopeSchema,
  migrateLocalA3Protocol,
  parseLocalA3ArchiveEnvelope,
} from "./localA3Schemas";
import type { LocalA3Protocol } from "./localA3Types";

const validProtocol: LocalA3Protocol = {
  schemaVersion: 1,
  id: "a3-1",
  status: "open",
  dashboardType: "print",
  dashboardTitle: "Печать",
  period: { from: "2026-06-01", to: "2026-06-24", label: "01.06.2026 - 24.06.2026" },
  source: { fileName: "paper-cut-2026-06.csv" },
  deviation: {
    title: "Высокая доля односторонней печати",
    metricKey: "simplexRatioPercent",
    metricLabel: "Доля односторонней печати",
    fact: "60,8%",
    target: "ниже 40%",
    scale: "20,8 п.п. выше ориентира",
  },
  form: {
    problem: "Односторонняя печать выше ориентира.",
    cause: "Не настроена двусторонняя печать по умолчанию.",
    solution: "Проверить настройки печати у ключевых пользователей.",
    owner: "ИТ",
    dueDate: "2026-06-30",
    expectedResult: "Снижение доли односторонней печати.",
    checkCriteria: "Доля односторонней печати ниже 40% в следующем отчете.",
  },
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

describe("localA3Schemas", () => {
  it("accepts a valid v1 protocol and trims user text", () => {
    const parsed = migrateLocalA3Protocol({
      ...validProtocol,
      form: { ...validProtocol.form, owner: "  ИТ  " },
    });

    expect(parsed.form.owner).toBe("ИТ");
    expect(parsed.status).toBe("open");
  });

  it("rejects unknown protocol status", () => {
    expect(() => migrateLocalA3Protocol({ ...validProtocol, status: "review" })).toThrow(/status/i);
  });

  it("requires closedAt only for closed protocols", () => {
    expect(() => migrateLocalA3Protocol({ ...validProtocol, status: "closed" })).toThrow(/closedAt/i);
    expect(() => migrateLocalA3Protocol({ ...validProtocol, closedAt: "2026-06-25T10:00:00.000Z" })).toThrow(/closedAt/i);
  });

  it("rejects unknown protocol schema version", () => {
    expect(() => migrateLocalA3Protocol({ ...validProtocol, schemaVersion: 2 })).toThrow(/schemaVersion/i);
  });

  it("returns Russian validation messages for empty required fields", () => {
    expect(() => migrateLocalA3Protocol({ ...validProtocol, form: { ...validProtocol.form, problem: "" } })).toThrow(/\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043f\u043e\u043b\u0435/);
  });

  it("rejects non-canonical datetime strings", () => {
    expect(() => migrateLocalA3Protocol({ ...validProtocol, createdAt: "2026-06-24T15:00:00+05:00" })).toThrow(/ISO|\u0444\u043e\u0440\u043c\u0430\u0442\u0435/i);
  });

  it("rejects archive events that reference missing protocols", () => {
    const result = parseLocalA3ArchiveEnvelope({
      kind: "raport-local-a3-archive",
      schemaVersion: 1,
      exportedAt: "2026-06-24T10:00:00.000Z",
      app: { name: "raport", feature: "local-a3" },
      protocols: [validProtocol],
      events: [
        {
          schemaVersion: 1,
          id: "event-1",
          protocolId: "missing",
          type: "comment_added",
          createdAt: "2026-06-24T11:00:00.000Z",
          payload: {
            type: "comment_added",
            comment: { id: "comment-1", text: "Комментарий", authorName: "Аналитик", createdAt: "2026-06-24T11:00:00.000Z" },
          },
        },
      ],
      snapshots: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toMatch(/\u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0439 A3-\u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b/i);
  });

  it("keeps archive envelope strict", () => {
    expect(() => localA3ArchiveEnvelopeSchema.parse({
      kind: "raport-local-a3-archive",
      schemaVersion: 1,
      exportedAt: "2026-06-24T10:00:00.000Z",
      app: { name: "raport", feature: "local-a3" },
      protocols: [],
      events: [],
      snapshots: [],
      extra: true,
    })).toThrow();
  });
});
