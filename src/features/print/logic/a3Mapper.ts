import type { DashboardDeviation } from "../../local-a3/dashboardDeviation";
import type { PrintExcessSummary, PrintKpis } from "../types";
import { formatInteger, formatPercent } from "./dashboard";

export type PrintMainInsightA3Input = {
  periodLabel: string;
  periodStart?: string;
  periodEnd?: string;
  sourceFileName?: string;
  kpis: PrintKpis;
  deviationRatio: number;
  deviationCost: number;
  excessSummary: PrintExcessSummary;
};

function dominantDeviation(input: PrintMainInsightA3Input): string {
  const candidates = [
    { label: "односторонняя печать", value: input.kpis.simplexPages },
    { label: "цветная печать", value: input.kpis.colorPages },
    { label: "задания от 100 страниц", value: input.kpis.bigPages },
    { label: "потенциально избыточная печать", value: input.excessSummary.pages },
  ].sort((left, right) => right.value - left.value);

  const top = candidates[0];
  return top && top.value > 0 ? `${top.label}: ${formatInteger(top.value)} стр.` : "критичных объемов не найдено";
}

export function mapPrintMainInsightToA3Deviation(input: PrintMainInsightA3Input): DashboardDeviation {
  return {
    id: "print-main-deviation",
    dashboardType: "print",
    dashboardTitle: "Печать: контроль печати",
    periodLabel: input.periodLabel,
    ...(input.periodStart ? { periodStart: input.periodStart } : {}),
    ...(input.periodEnd ? { periodEnd: input.periodEnd } : {}),
    ...(input.sourceFileName ? { sourceFileName: input.sourceFileName } : {}),
    deviationTitle: "Печать с отклонениями требует разбора",
    metricName: "Страниц с отклонениями",
    actualValue: formatPercent(input.deviationRatio),
    deviationScale: `оценка отклонений: ${formatInteger(input.deviationCost)} руб.`,
    severity: input.deviationRatio >= 35 || input.kpis.bigJobs >= 10 ? "danger" : "warning",
    affectedObjectType: "category",
    affectedObjectName: "структура печати",
    evidenceSummary: [
      `Всего страниц: ${formatInteger(input.kpis.totalPages)}.`,
      `Односторонняя печать: ${formatInteger(input.kpis.simplexPages)} стр. (${formatPercent(input.kpis.simplexRatio)}).`,
      `Цветная печать: ${formatInteger(input.kpis.colorPages)} стр. (${formatPercent(input.kpis.colorRatio)}).`,
      `Заданий от 100 стр.: ${formatInteger(input.kpis.bigJobs)}, страниц: ${formatInteger(input.kpis.bigPages)}.`,
      `Избыточная печать: ${formatInteger(input.excessSummary.pages)} стр., ${formatInteger(input.excessSummary.jobs)} заданий.`,
      `Основное отклонение: ${dominantDeviation(input)}.`,
    ].join("\n"),
  };
}
