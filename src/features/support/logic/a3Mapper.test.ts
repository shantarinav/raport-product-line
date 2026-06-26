import { describe, expect, it } from "vitest";
import { createA3DraftFromDeviation } from "../../local-a3/dashboardDeviation";
import { mapSupportMainInsightToA3Deviation } from "./a3Mapper";

describe("mapSupportMainInsightToA3Deviation", () => {
  it("creates an aggregate A3 deviation for SLA control", () => {
    const deviation = mapSupportMainInsightToA3Deviation({
      periodLabel: "01.06.2026 - 24.06.2026",
      controlPercent: 95,
      kpis: {
        totalTickets: 100,
        applicableTickets: 90,
        inSlaTickets: 72,
        overdueTickets: 18,
        dataProblems: 10,
        slaRate: 0.8,
        overdueRate: 0.2,
      },
      attentionTopic: {
        category: "Печать / принтеры",
        total: 20,
        applicable: 20,
        inSla: 14,
        overdue: 6,
        dataProblems: 0,
        slaRate: 0.7,
        violationRate: 0.3,
        intensity: "средняя",
      },
    });

    expect(deviation).toMatchObject({
      dashboardType: "support",
      dashboardTitle: "Техподдержка: SLA заявок",
      deviationTitle: "SLA ниже цели контроля",
      metricName: "SLA выполнен",
      actualValue: "80,0%",
      targetValue: "95%",
      affectedObjectType: "category",
      affectedObjectName: "Печать / принтеры",
    });
    expect(deviation.evidenceSummary).toContain("Просрочено: 18");
    expect(deviation.evidenceSummary).not.toContain("ticketNumber");
    expect(JSON.stringify(createA3DraftFromDeviation(deviation))).not.toContain("sourceRow");
  });
});
