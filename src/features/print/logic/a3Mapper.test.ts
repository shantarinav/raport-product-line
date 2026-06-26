import { describe, expect, it } from "vitest";
import { createA3DraftFromDeviation } from "../../local-a3/dashboardDeviation";
import { mapPrintMainInsightToA3Deviation } from "./a3Mapper";

describe("mapPrintMainInsightToA3Deviation", () => {
  it("creates a safe aggregate A3 deviation for Print", () => {
    const deviation = mapPrintMainInsightToA3Deviation({
      periodLabel: "01.06.2026 - 24.06.2026",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-24",
      kpis: {
        totalPages: 1000,
        totalJobs: 120,
        simplexPages: 620,
        simplexRatio: 62,
        colorPages: 130,
        colorRatio: 13,
        bigJobs: 2,
        bigPages: 250,
        usersCount: 40,
        estimatedCost: 1500,
      },
      deviationRatio: 62,
      deviationCost: 900,
      excessSummary: {
        jobs: 7,
        pages: 80,
        users: 5,
        categories: [],
      },
    });

    expect(deviation).toMatchObject({
      dashboardType: "print",
      dashboardTitle: "Печать: контроль печати",
      deviationTitle: "Печать с отклонениями требует разбора",
      metricName: "Страниц с отклонениями",
      actualValue: "62%",
      deviationScale: "оценка отклонений: 900 руб.",
      affectedObjectType: "category",
      affectedObjectName: "структура печати",
    });
    expect(deviation.evidenceSummary).toContain("Односторонняя печать");
    expect(deviation.evidenceSummary).not.toContain("documentName");
    expect(deviation.evidenceSummary).not.toContain("user");
    expect(JSON.stringify(createA3DraftFromDeviation(deviation))).not.toContain("raw");
  });
});
