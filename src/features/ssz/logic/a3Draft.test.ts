import { describe, expect, it } from "vitest";
import { buildSszTechnologyA3Draft } from "./a3Draft";
import type { ContributionRow } from "./dashboard";

function row(partial: Partial<ContributionRow>): ContributionRow {
  return {
    key: "not-set",
    departmentKey: "not-set",
    technologyTime: 0,
    noTechnologyTime: 0,
    totalTime: 0,
    operationCount: 0,
    technologyOperationCount: 0,
    noTechnologyOperationCount: 0,
    ownTechnologyRatio: null,
    ownNoTechnologyRatio: null,
    ...partial,
  };
}

describe("buildSszTechnologyA3Draft", () => {
  it("builds a bounded A3 draft from the SSZ technology deviation", () => {
    const draft = buildSszTechnologyA3Draft({
      periodLabel: "01.05.2026 - 31.05.2026",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      sourceFileName: "ssz-demo-with-sensitive-name.xlsx",
      workTechnologyRatio: 0.156,
      targetPercent: 70,
      deviationScale: "отклонение: 54,4 п.п.",
      attentionRows: {
        department: row({
          key: "400 Цех аппаратов высокого давления № 40",
          noTechnologyTime: 26174,
          totalTime: 26600,
          ownNoTechnologyRatio: 0.984,
        }),
        operation: row({
          key: "Сварка",
          noTechnologyTime: 6015.7,
          totalTime: 6015.7,
          ownNoTechnologyRatio: 1,
        }),
        order: row({
          key: "206713102",
          noTechnologyTime: 6544.3,
          totalTime: 7923,
          ownNoTechnologyRatio: 0.826,
        }),
      },
    });

    expect(draft).toMatchObject({
      dashboardType: "ssz",
      dashboardTitle: "ССЗ: качество оформления",
      periodLabel: "01.05.2026 - 31.05.2026",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      deviationTitle: "Доля работ по технологии ниже цели",
      metricName: "Доля работ по технологии",
      actualValue: "15,6%",
      targetValue: "70%",
      deviationScale: "отклонение: 54,4 п.п.",
      affectedObjectType: "department",
      affectedObjectName: "400 Цех аппаратов высокого давления № 40",
      sourceFileName: "ssz-demo-with-sensitive-name.xlsx",
    });
    expect(draft.evidenceSummary).toContain("Цех: 400 Цех аппаратов высокого давления № 40");
    expect(draft.evidenceSummary).toContain("Операция: Сварка");
    expect(draft.evidenceSummary).toContain("Заказ: 206713102");
    expect(draft.evidenceSummary).not.toContain("sszRecords");
    expect(draft.evidenceSummary).not.toContain("operations");
  });

  it("limits long object labels in the A3 snapshot", () => {
    const longDepartment = `400 ${"очень длинное название ".repeat(20)}`;
    const draft = buildSszTechnologyA3Draft({
      periodLabel: "01.05.2026 - 31.05.2026",
      workTechnologyRatio: 0.2,
      targetPercent: 70,
      deviationScale: "отклонение: 50,0 п.п.",
      attentionRows: {
        department: row({
          key: longDepartment,
          noTechnologyTime: 100,
          totalTime: 120,
          ownNoTechnologyRatio: 0.833,
        }),
      },
    });

    expect(draft.affectedObjectName?.length).toBeLessThanOrEqual(120);
    expect(draft.affectedObjectName).toMatch(/…$/);
    expect(draft.evidenceSummary?.length).toBeLessThanOrEqual(800);
  });
});
