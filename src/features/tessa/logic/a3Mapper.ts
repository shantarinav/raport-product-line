import type { DashboardDeviation } from "../../local-a3/dashboardDeviation";
import type { AgreementKpis } from "../types";

export type TessaMainInsightA3Input = {
  periodLabel: string;
  periodStart?: string;
  periodEnd?: string;
  sourceFileName?: string;
  kpis: AgreementKpis;
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

export function mapTessaMainInsightToA3Deviation(input: TessaMainInsightA3Input): DashboardDeviation {
  return {
    id: "tessa-stuck-agreements",
    dashboardType: "tessa",
    dashboardTitle: "Tessa: исполнительская дисциплина",
    periodLabel: input.periodLabel,
    ...(input.periodStart ? { periodStart: input.periodStart } : {}),
    ...(input.periodEnd ? { periodEnd: input.periodEnd } : {}),
    ...(input.sourceFileName ? { sourceFileName: input.sourceFileName } : {}),
    deviationTitle: "Просроченные согласования требуют разбора",
    metricName: "Просроченные согласования",
    actualValue: formatInteger(input.kpis.stuck),
    targetValue: "0",
    deviationScale: `${formatPercent(input.kpis.stuckRate)} от открытых, максимум ${formatInteger(input.kpis.maxStuckDays)} дн.`,
    severity: input.kpis.criticalOver30 > 0 ? "danger" : "warning",
    affectedObjectType: "dashboard",
    affectedObjectName: "договорные согласования",
    evidenceSummary: [
      `Открыто в работе: ${formatInteger(input.kpis.open)}.`,
      `Просрочено: ${formatInteger(input.kpis.stuck)} (${formatPercent(input.kpis.stuckRate)}).`,
      `Критично больше 30 дней: ${formatInteger(input.kpis.criticalOver30)}.`,
      `Исполнителей с просрочками: ${formatInteger(input.kpis.attentionPeople)}.`,
      `Истекает сегодня: ${formatInteger(input.kpis.riskToday)}, на неделе: ${formatInteger(input.kpis.riskWeek)}.`,
    ].join("\n"),
  };
}
