import type { DashboardDeviation } from "../../local-a3/dashboardDeviation";
import type { SupportKpis, SupportTopicSlaStat } from "../supportTypes";
import { formatSupportPercent } from "./supportMetrics";

export type SupportMainInsightA3Input = {
  periodLabel: string;
  periodStart?: string;
  periodEnd?: string;
  sourceFileName?: string;
  controlPercent: number;
  kpis: SupportKpis;
  attentionTopic?: SupportTopicSlaStat;
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
}

export function mapSupportMainInsightToA3Deviation(input: SupportMainInsightA3Input): DashboardDeviation {
  const gapPercent = Math.max(0, input.controlPercent - input.kpis.slaRate * 100);

  return {
    id: "support-sla-gap",
    dashboardType: "support",
    dashboardTitle: "Техподдержка: SLA заявок",
    periodLabel: input.periodLabel,
    ...(input.periodStart ? { periodStart: input.periodStart } : {}),
    ...(input.periodEnd ? { periodEnd: input.periodEnd } : {}),
    ...(input.sourceFileName ? { sourceFileName: input.sourceFileName } : {}),
    deviationTitle: "SLA ниже цели контроля",
    metricName: "SLA выполнен",
    actualValue: formatSupportPercent(input.kpis.slaRate),
    targetValue: `${input.controlPercent}%`,
    deviationScale: gapPercent > 0 ? `ниже цели на ${gapPercent.toFixed(1).replace(".", ",")} п.п.` : "цель выполнена",
    severity: gapPercent >= 10 ? "danger" : "warning",
    affectedObjectType: input.attentionTopic ? "category" : "dashboard",
    affectedObjectName: input.attentionTopic?.category ?? "SLA заявок",
    evidenceSummary: [
      `Заявок с расчетом SLA: ${formatInteger(input.kpis.applicableTickets)}.`,
      `В SLA: ${formatInteger(input.kpis.inSlaTickets)}.`,
      `Просрочено: ${formatInteger(input.kpis.overdueTickets)} (${formatSupportPercent(input.kpis.overdueRate)}).`,
      input.attentionTopic
        ? `Зона внимания: ${input.attentionTopic.category}, SLA ${formatSupportPercent(input.attentionTopic.slaRate)}, просрочено ${formatInteger(input.attentionTopic.overdue)}.`
        : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join("\n"),
  };
}
