import { SUPPORT_CATEGORY_ORDER, SUPPORT_PLAN_BUCKETS, SUPPORT_THRESHOLDS } from "../supportConfig";
import type {
  SupportDailyPoint,
  SupportDataQualitySummary,
  SupportFilters,
  SupportKpis,
  SupportPlanBucketStat,
  SupportQuantiles,
  SupportTicket,
  SupportTopicSlaStat,
} from "../supportTypes";

export function formatSupportDateTime(date: Date | null): string {
  if (!date) return "не указано";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatSupportDate(date: Date | null): string {
  if (!date) return "не указано";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatSupportPercent(value: number): string {
  return `${(value * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

export function formatSupportHours(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "нет данных";
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ч`;
}

export function dateInputValue(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function periodLabel(tickets: SupportTicket[]): string {
  const dates = tickets.flatMap((ticket) => (ticket.createdAt ? [ticket.createdAt] : []));
  if (dates.length === 0) return "период не определен";
  const min = new Date(Math.min(...dates.map((date) => date.getTime())));
  const max = new Date(Math.max(...dates.map((date) => date.getTime())));
  return `${formatSupportDate(min)}–${formatSupportDate(max)}`;
}

export function initialSupportFilters(tickets: SupportTicket[] = []): SupportFilters {
  const dates = tickets.flatMap((ticket) => (ticket.createdAt ? [ticket.createdAt] : []));
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;

  return {
    dateFrom: dateInputValue(minDate),
    dateTo: dateInputValue(maxDate),
    controlPercent: SUPPORT_THRESHOLDS.controlSlaPercent,
    slaStatus: "",
    planBucket: "",
    category: "",
    query: "",
  };
}

function toStartOfDay(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toEndOfDay(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function applySupportFilters(tickets: SupportTicket[], filters: SupportFilters): SupportTicket[] {
  const dateFrom = toStartOfDay(filters.dateFrom);
  const dateTo = toEndOfDay(filters.dateTo);
  const query = filters.query.trim().toLowerCase().replace(/ё/g, "е");

  return tickets.filter((ticket) => {
    if (dateFrom && (!ticket.createdAt || ticket.createdAt.getTime() < dateFrom.getTime())) return false;
    if (dateTo && (!ticket.createdAt || ticket.createdAt.getTime() > dateTo.getTime())) return false;
    if (filters.slaStatus && ticket.slaStatus !== filters.slaStatus) return false;
    if (filters.planBucket && ticket.planBucket !== filters.planBucket) return false;
    if (filters.category && ticket.category !== filters.category) return false;
    if (query) {
      const haystack = `${ticket.ticketNumber} ${ticket.topic}`.toLowerCase().replace(/ё/g, "е");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function calculateSupportKpis(tickets: SupportTicket[]): SupportKpis {
  const applicable = tickets.filter((ticket) => ticket.slaApplicable);
  const inSlaTickets = applicable.filter((ticket) => ticket.slaStatus === "В SLA").length;
  const overdueTickets = applicable.filter((ticket) => ticket.slaStatus === "Нарушен SLA").length;
  const dataProblems = tickets.filter((ticket) => ticket.slaStatus === "Нет SLA_plan" || ticket.slaStatus === "Нет SLA_fact").length;

  return {
    totalTickets: tickets.length,
    applicableTickets: applicable.length,
    inSlaTickets,
    overdueTickets,
    dataProblems,
    slaRate: applicable.length > 0 ? inSlaTickets / applicable.length : 0,
    overdueRate: applicable.length > 0 ? overdueTickets / applicable.length : 0,
  };
}

function percentile(sortedValues: number[], percentileValue: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  const value = sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  return Math.round(value * 10) / 10;
}

export function calculateQuantiles(values: number[]): SupportQuantiles {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  return {
    q1: percentile(sorted, 0.25),
    q2: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

export function resolutionQuantiles(tickets: SupportTicket[]): SupportQuantiles {
  return calculateQuantiles(
    tickets.flatMap((ticket) =>
      ticket.createdAt && ticket.slaPlan && ticket.slaFact && ticket.resolutionHours !== null ? [ticket.resolutionHours] : [],
    ),
  );
}

export function overdueQuantiles(tickets: SupportTicket[]): SupportQuantiles {
  return calculateQuantiles(tickets.flatMap((ticket) => (ticket.slaStatus === "Нарушен SLA" ? [ticket.overdueHours] : [])));
}

function dateKey(date: Date): string {
  return dateInputValue(date);
}

export function buildDailySla(tickets: SupportTicket[]): SupportDailyPoint[] {
  const groups = new Map<string, SupportTicket[]>();
  tickets.forEach((ticket) => {
    if (!ticket.createdAt) return;
    const key = dateKey(ticket.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), ticket]);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const kpis = calculateSupportKpis(items);
      return {
        dateKey: key,
        label: formatSupportDate(items[0]?.createdAt ?? null),
        total: kpis.totalTickets,
        applicable: kpis.applicableTickets,
        inSla: kpis.inSlaTickets,
        overdue: kpis.overdueTickets,
        slaRate: kpis.slaRate,
      };
    });
}

export function buildTopicSlaStats(tickets: SupportTicket[]): SupportTopicSlaStat[] {
  const totals = SUPPORT_CATEGORY_ORDER.map((category) => ({
    category,
    total: tickets.filter((ticket) => ticket.category === category).length,
  })).filter((item) => item.total > 0);
  const maxTotal = Math.max(1, ...totals.map((item) => item.total));

  return totals
    .map(({ category, total }) => {
      const items = tickets.filter((ticket) => ticket.category === category);
      const applicable = items.filter((ticket) => ticket.slaApplicable).length;
      const overdue = items.filter((ticket) => ticket.slaStatus === "Нарушен SLA").length;
      const inSla = items.filter((ticket) => ticket.slaStatus === "В SLA").length;
      const intensityRate = total / maxTotal;
      const intensity: SupportTopicSlaStat["intensity"] = intensityRate >= 0.67 ? "высокая" : intensityRate >= 0.34 ? "средняя" : "низкая";

      return {
        category,
        total,
        applicable,
        inSla,
        overdue,
        dataProblems: total - applicable,
        slaRate: applicable > 0 ? inSla / applicable : 0,
        violationRate: applicable > 0 ? overdue / applicable : 0,
        intensity,
      };
    })
    .sort((a, b) => b.total - a.total || a.slaRate - b.slaRate || b.overdue - a.overdue);
}

export function buildPlanBucketStats(tickets: SupportTicket[]): SupportPlanBucketStat[] {
  const totalOverdue = tickets.filter((ticket) => ticket.slaStatus === "Нарушен SLA").length;
  const stats = SUPPORT_PLAN_BUCKETS.map(({ value }) => {
    const items = tickets.filter((ticket) => ticket.planBucket === value);
    const applicable = items.filter((ticket) => ticket.slaApplicable).length;
    const overdue = items.filter((ticket) => ticket.slaStatus === "Нарушен SLA").length;
    return {
      bucket: value,
      total: items.length,
      applicable,
      overdue,
      overdueShare: totalOverdue > 0 ? overdue / totalOverdue : 0,
      violationRate: applicable > 0 ? overdue / applicable : 0,
      isHotspot: false,
    };
  });

  const hotspot = [...stats].sort((a, b) => b.overdue - a.overdue || b.violationRate - a.violationRate)[0];
  return stats.map((item) => ({ ...item, isHotspot: item.bucket === hotspot?.bucket && item.overdue > 0 }));
}

export function buildOverdueTail(tickets: SupportTicket[], limit = 10): SupportTicket[] {
  return tickets
    .filter((ticket) => ticket.slaStatus === "Нарушен SLA")
    .sort((a, b) => b.overdueHours - a.overdueHours)
    .slice(0, limit);
}

export function buildDataQualitySummary(tickets: SupportTicket[], filters: SupportFilters): SupportDataQualitySummary {
  const periodEnd = toEndOfDay(filters.dateTo);
  return {
    missingPlan: tickets.filter((ticket) => ticket.slaStatus === "Нет SLA_plan"),
    missingFact: tickets.filter((ticket) => ticket.slaStatus === "Нет SLA_fact"),
    extremeOverdue: tickets.filter((ticket) => ticket.overdueHours > SUPPORT_THRESHOLDS.extremeOverdueHours),
    closedAfterPeriod: tickets.filter((ticket) => Boolean(periodEnd && ticket.slaFact && ticket.slaFact.getTime() > periodEnd.getTime())),
  };
}

export function buildMainInsight(kpis: SupportKpis, overdue: SupportQuantiles, resolution: SupportQuantiles, controlPercent: number = SUPPORT_THRESHOLDS.controlSlaPercent): string {
  const slaText = formatSupportPercent(kpis.slaRate);
  const medianText = formatSupportHours(resolution.q2);
  const hasHeavyTail = overdue.p90 !== null && overdue.q3 !== null && overdue.p90 > overdue.q3 * SUPPORT_THRESHOLDS.heavyTailMultiplier && overdue.p90 - overdue.q3 >= SUPPORT_THRESHOLDS.heavyTailMinGapHours;
  const tailText = hasHeavyTail ? " У просрочек есть тяжелый хвост: P90 заметно выше Q3." : "";

  if (kpis.applicableTickets === 0) {
    return "В отчете нет заявок, по которым можно рассчитать выполнение SLA: отсутствует SLA_plan или SLA_fact.";
  }

  if (kpis.slaRate < controlPercent / 100) {
    return `SLA выполняется только по ${slaText} заявок с планом и фактом. Медиана времени решения — ${medianText}.${tailText}`;
  }

  if (kpis.slaRate < SUPPORT_THRESHOLDS.healthySlaPercent / 100) {
    return `SLA находится в зоне контроля: выполнено ${slaText} заявок с планом и фактом. Медиана времени решения — ${medianText}.${tailText}`;
  }

  return `SLA выглядит стабильно: выполнено ${slaText} заявок с планом и фактом. Медиана времени решения — ${medianText}.${tailText}`;
}
