import { describe, expect, it } from "vitest";
import type { LocalA3Protocol } from "../../local-a3/localA3Types";
import { isSszRelatedTechnologyA3, summarizeSszRelatedTechnologyA3 } from "./a3Related";

function protocol(overrides: Partial<LocalA3Protocol> = {}): LocalA3Protocol {
  return {
    schemaVersion: 1,
    id: "a3-1",
    status: "open",
    dashboardType: "ssz",
    dashboardTitle: "ССЗ",
    period: { from: "2026-06-01", to: "2026-06-09", label: "01.06.2026 - 09.06.2026" },
    source: {},
    deviation: {
      title: "Доля работ по технологии ниже цели",
      metricLabel: "Доля работ по технологии",
    },
    form: {
      problem: "Проблема",
      cause: "Причина",
      solution: "Решение",
      owner: "",
      expectedResult: "Результат",
      checkCriteria: "Проверка",
    },
    createdAt: "2026-06-25T10:00:00.000Z",
    updatedAt: "2026-06-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("ssz A3 related matching", () => {
  it("matches SSZ technology protocols with overlapping period", () => {
    expect(isSszRelatedTechnologyA3(protocol(), "2026-06-05", "2026-06-30")).toBe(true);
  });

  it("does not match other dashboards or non-overlapping periods", () => {
    expect(isSszRelatedTechnologyA3(protocol({ dashboardType: "print" }), "2026-06-05", "2026-06-30")).toBe(false);
    expect(isSszRelatedTechnologyA3(protocol({ period: { from: "2026-05-01", to: "2026-05-31", label: "Май" } }), "2026-06-01", "2026-06-30")).toBe(false);
  });

  it("summarizes related protocols by status", () => {
    const summary = summarizeSszRelatedTechnologyA3([
      protocol({ id: "a3-open", status: "open" }),
      protocol({ id: "a3-work", status: "in_progress" }),
      protocol({ id: "a3-closed", status: "closed", period: { from: "2026-05-01", to: "2026-05-31", label: "Май" } }),
    ], "2026-06-01", "2026-06-30");

    expect(summary).toMatchObject({ total: 2, open: 1, in_progress: 1, closed: 0 });
  });
});
