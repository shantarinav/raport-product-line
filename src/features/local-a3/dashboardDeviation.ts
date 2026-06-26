import type { LocalA3DraftInput } from "./localA3Commands";
import type { LocalA3DashboardType } from "./localA3Types";

export type DashboardDeviationSeverity = "info" | "warning" | "danger";

export type DashboardDeviation = {
  id: string;
  dashboardType: LocalA3DashboardType;
  dashboardTitle: string;
  periodLabel: string;
  periodStart?: string;
  periodEnd?: string;
  deviationTitle: string;
  metricName: string;
  actualValue?: string | number;
  targetValue?: string | number;
  deviationScale?: string | number;
  severity?: DashboardDeviationSeverity;
  affectedObjectType?: string;
  affectedObjectId?: string;
  affectedObjectName?: string;
  evidenceSummary?: string;
  sourceFileName?: string;
  sourceFileHash?: string;
  createdAt?: string;
};

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function createA3DraftFromDeviation(deviation: DashboardDeviation, now: () => string = () => new Date().toISOString()): LocalA3DraftInput {
  return {
    dashboardType: deviation.dashboardType,
    dashboardTitle: deviation.dashboardTitle,
    periodLabel: deviation.periodLabel,
    ...(deviation.periodStart ? { periodStart: deviation.periodStart } : {}),
    ...(deviation.periodEnd ? { periodEnd: deviation.periodEnd } : {}),
    deviationTitle: deviation.deviationTitle,
    metricName: deviation.metricName,
    ...(deviation.actualValue !== undefined ? { actualValue: deviation.actualValue } : {}),
    ...(deviation.targetValue !== undefined ? { targetValue: deviation.targetValue } : {}),
    ...(deviation.deviationScale !== undefined ? { deviationScale: deviation.deviationScale } : {}),
    ...(optionalText(deviation.sourceFileName) ? { sourceFileName: optionalText(deviation.sourceFileName) } : {}),
    ...(optionalText(deviation.sourceFileHash) ? { sourceFileHash: optionalText(deviation.sourceFileHash) } : {}),
    ...(optionalText(deviation.affectedObjectType) ? { affectedObjectType: optionalText(deviation.affectedObjectType) } : {}),
    ...(optionalText(deviation.affectedObjectId) ? { affectedObjectId: optionalText(deviation.affectedObjectId) } : {}),
    ...(optionalText(deviation.affectedObjectName) ? { affectedObjectName: optionalText(deviation.affectedObjectName) } : {}),
    ...(optionalText(deviation.evidenceSummary) ? { evidenceSummary: optionalText(deviation.evidenceSummary) } : {}),
    createdFromDashboardAt: deviation.createdAt ?? now(),
  };
}
