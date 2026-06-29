import { describe, expect, it } from "vitest";
import type { SupportTicket } from "../supportTypes";
import { buildOverdueTail, calculateSupportKpis, overdueQuantiles, supportTimeFlowQuantiles } from "./supportMetrics";

function ticket(patch: Partial<SupportTicket>): SupportTicket {
  return {
    id: "ticket",
    format: "worktime",
    ticketNumber: "1",
    topic: "Тема",
    createdAt: new Date("2026-06-24T10:00:00"),
    slaPlan: new Date("2026-06-24T12:00:00"),
    slaFact: new Date("2026-06-24T11:00:00"),
    sourceSlaStatus: "Выполнен",
    category: "Прочее / нужен классификатор",
    slaApplicable: true,
    slaStatus: "В SLA",
    calendarResolutionHours: 1,
    resolutionHours: 4,
    fullTimeHours: 4,
    slaWorkHours: 1,
    waitingHours: 3,
    planHours: 2,
    priorityLabel: "Приоритет2, 2ч.",
    priorityLevel: 2,
    priorityHours: 2,
    workOverdueHours: 0,
    calendarOverdueHours: 0,
    overdueHours: 0,
    reserveHours: 1,
    planBucket: "2 часа",
    overdueBucket: "В срок",
    sourceRow: 1,
    ...patch,
  };
}

describe("supportMetrics", () => {
  it("keeps open tickets out of SLA rate and data-quality errors", () => {
    const kpis = calculateSupportKpis([
      ticket({ id: "met", slaStatus: "В SLA", slaApplicable: true }),
      ticket({ id: "breached", slaStatus: "Нарушен SLA", slaApplicable: true, overdueHours: 1.5 }),
      ticket({ id: "open", slaStatus: "В работе", slaApplicable: false, slaFact: null, sourceSlaStatus: "В работе" }),
      ticket({ id: "bad", slaStatus: "Нет SLA_fact", slaApplicable: false, slaFact: null, sourceSlaStatus: null }),
    ]);

    expect(kpis.totalTickets).toBe(4);
    expect(kpis.applicableTickets).toBe(2);
    expect(kpis.inSlaTickets).toBe(1);
    expect(kpis.overdueTickets).toBe(1);
    expect(kpis.openTickets).toBe(1);
    expect(kpis.dataProblems).toBe(1);
    expect(kpis.slaRate).toBe(0.5);
  });

  it("summarizes total, clean work and waiting time separately", () => {
    const summary = supportTimeFlowQuantiles([
      ticket({ id: "a", fullTimeHours: 4, resolutionHours: 4, slaWorkHours: 1, waitingHours: 3 }),
      ticket({ id: "b", fullTimeHours: 8, resolutionHours: 8, slaWorkHours: 2, waitingHours: 6 }),
      ticket({ id: "open", slaStatus: "В работе", slaApplicable: false, slaFact: null, fullTimeHours: 1, resolutionHours: 1, slaWorkHours: 0.5, waitingHours: 0.5 }),
    ]);

    expect(summary.totalResolution.q2).toBe(6);
    expect(summary.workTime.q2).toBe(1.5);
    expect(summary.waiting.q2).toBe(4.5);
  });

  it("keeps zero-overdue violations out of overdue tail and quantiles", () => {
    const rows = [
      ticket({ id: "zero", slaStatus: "Нарушен SLA", overdueHours: 0 }),
      ticket({ id: "rounds-to-zero", slaStatus: "Нарушен SLA", overdueHours: 0.01 }),
      ticket({ id: "positive", slaStatus: "Нарушен SLA", overdueHours: 1.2 }),
      ticket({ id: "met", slaStatus: "В SLA", overdueHours: 0 }),
    ];

    expect(buildOverdueTail(rows)).toHaveLength(1);
    expect(buildOverdueTail(rows)[0]?.id).toBe("positive");
    expect(overdueQuantiles(rows).q2).toBe(1.2);
  });
});
