import { describe, expect, it } from "vitest";
import { createA3DraftFromDeviation } from "../../local-a3/dashboardDeviation";
import { mapTessaMainInsightToA3Deviation } from "./a3Mapper";

describe("mapTessaMainInsightToA3Deviation", () => {
  it("creates an aggregate A3 deviation without document or person details", () => {
    const deviation = mapTessaMainInsightToA3Deviation({
      periodLabel: "01.06.2026 - 24.06.2026",
      kpis: {
        open: 80,
        stuck: 12,
        riskToday: 3,
        riskWeek: 9,
        criticalOver30: 1,
        maxStuckDays: 45,
        stuckRate: 15,
        attentionPeople: 5,
      },
    });

    expect(deviation).toMatchObject({
      dashboardType: "tessa",
      dashboardTitle: "Tessa: исполнительская дисциплина",
      deviationTitle: "Просроченные согласования требуют разбора",
      metricName: "Просроченные согласования",
      actualValue: "12",
      targetValue: "0",
      affectedObjectType: "dashboard",
    });
    expect(deviation.evidenceSummary).toContain("Открыто в работе: 80");
    expect(deviation.evidenceSummary).not.toContain("responsible");
    expect(deviation.evidenceSummary).not.toContain("contractNumber");
    expect(JSON.stringify(createA3DraftFromDeviation(deviation))).not.toContain("records");
  });
});
