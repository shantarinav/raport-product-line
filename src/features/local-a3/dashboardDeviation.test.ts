import { describe, expect, it } from "vitest";
import { createLocalA3ProtocolDraft } from "./localA3Commands";
import { createA3DraftFromDeviation, type DashboardDeviation } from "./dashboardDeviation";

const baseDeviation: DashboardDeviation = {
  id: "ssz-technology-gap",
  dashboardType: "ssz",
  dashboardTitle: "ССЗ: качество оформления",
  periodLabel: "01.06.2026 - 09.06.2026",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-09",
  deviationTitle: "Доля работ по технологии ниже цели",
  metricName: "Доля работ по технологии",
  actualValue: "7,2%",
  targetValue: "70%",
  deviationScale: "отклонение: 62,8 п.п.",
  affectedObjectType: "department",
  affectedObjectName: "400 Цех аппаратов высокого давления № 40",
  evidenceSummary: "Цех: 4 623 н-ч без технологии.",
  createdAt: "2026-06-26T10:00:00.000Z",
};

describe("createA3DraftFromDeviation", () => {
  it("maps a dashboard deviation to Local A3 draft input", () => {
    const draft = createA3DraftFromDeviation(baseDeviation);

    expect(draft).toMatchObject({
      dashboardType: "ssz",
      dashboardTitle: "ССЗ: качество оформления",
      periodLabel: "01.06.2026 - 09.06.2026",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-09",
      deviationTitle: "Доля работ по технологии ниже цели",
      metricName: "Доля работ по технологии",
      actualValue: "7,2%",
      targetValue: "70%",
      deviationScale: "отклонение: 62,8 п.п.",
      affectedObjectType: "department",
      affectedObjectName: "400 Цех аппаратов высокого давления № 40",
      evidenceSummary: "Цех: 4 623 н-ч без технологии.",
      createdFromDashboardAt: "2026-06-26T10:00:00.000Z",
    });
  });

  it("omits empty optional fields and stays compatible with protocol draft creation", () => {
    const draft = createA3DraftFromDeviation(
      {
        id: "support-sla-gap",
        dashboardType: "support",
        dashboardTitle: "Техподдержка: SLA заявок",
        periodLabel: "Период не указан",
        deviationTitle: "SLA ниже цели",
        metricName: "SLA выполнен",
        sourceFileName: "   ",
        evidenceSummary: "   ",
      },
      () => "2026-06-26T11:00:00.000Z",
    );

    expect(draft.sourceFileName).toBeUndefined();
    expect(draft.evidenceSummary).toBeUndefined();

    const protocol = createLocalA3ProtocolDraft(draft, {
      createId: (prefix) => `${prefix}-test`,
      now: () => "2026-06-26T11:00:00.000Z",
    });

    expect(protocol.dashboardType).toBe("support");
    expect(protocol.deviation.title).toBe("SLA ниже цели");
    expect(protocol.deviation.context).toBeUndefined();
  });

  it("does not carry raw report payload by design", () => {
    const draft = createA3DraftFromDeviation(baseDeviation);
    const serialized = JSON.stringify(draft);

    expect(serialized).not.toContain("rawRows");
    expect(serialized).not.toContain("rawExcel");
    expect(serialized).not.toContain("dashboardState");
  });
});
