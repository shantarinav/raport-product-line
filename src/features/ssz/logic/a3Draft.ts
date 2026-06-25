import type { LocalA3DraftInput } from "../../local-a3/localA3Commands";
import type { ContributionRow } from "./dashboard";
import { formatHours, formatPercent } from "./format";

type AttentionRows = {
  order?: ContributionRow;
  department?: ContributionRow;
  operation?: ContributionRow;
  master?: ContributionRow;
};

const MAX_OBJECT_LABEL_LENGTH = 120;
const MAX_EVIDENCE_LENGTH = 800;

export type SszTechnologyA3DraftInput = {
  periodLabel: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  sourceFileName?: string;
  workTechnologyRatio: number | null;
  targetPercent: number;
  deviationScale: string;
  filterSummary?: string;
  attentionRows: AttentionRows;
};

function rowEvidence(label: string, row?: ContributionRow): string | null {
  if (!row) return null;
  return `${label}: ${boundedText(row.key, MAX_OBJECT_LABEL_LENGTH)} — ${formatHours(row.noTechnologyTime)} н-ч без технологии, доля ${formatPercent(row.ownNoTechnologyRatio)}.`;
}

function primaryAffectedObject(rows: AttentionRows): Pick<LocalA3DraftInput, "affectedObjectType" | "affectedObjectName"> {
  if (rows.department) return { affectedObjectType: "department", affectedObjectName: boundedText(rows.department.key, MAX_OBJECT_LABEL_LENGTH) };
  if (rows.operation) return { affectedObjectType: "operation", affectedObjectName: boundedText(rows.operation.key, MAX_OBJECT_LABEL_LENGTH) };
  if (rows.order) return { affectedObjectType: "order", affectedObjectName: boundedText(rows.order.key, MAX_OBJECT_LABEL_LENGTH) };
  if (rows.master) return { affectedObjectType: "master", affectedObjectName: boundedText(rows.master.key, MAX_OBJECT_LABEL_LENGTH) };
  return {};
}

function boundedText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

export function buildSszTechnologyA3Draft(input: SszTechnologyA3DraftInput): LocalA3DraftInput {
  const evidenceSummary = [
    input.filterSummary ? `Фильтры: ${input.filterSummary}` : null,
    rowEvidence("Цех", input.attentionRows.department),
    rowEvidence("Операция", input.attentionRows.operation),
    rowEvidence("Заказ", input.attentionRows.order),
    rowEvidence("Мастер", input.attentionRows.master),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const boundedEvidenceSummary = boundedText(evidenceSummary, MAX_EVIDENCE_LENGTH);

  return {
    dashboardType: "ssz",
    dashboardTitle: "ССЗ: качество оформления",
    periodLabel: input.periodLabel,
    ...(input.periodStart ? { periodStart: input.periodStart } : {}),
    ...(input.periodEnd ? { periodEnd: input.periodEnd } : {}),
    deviationTitle:
      input.workTechnologyRatio !== null && input.workTechnologyRatio >= input.targetPercent / 100
        ? "Контроль доли работ по технологии"
        : "Доля работ по технологии ниже цели",
    metricName: "Доля работ по технологии",
    actualValue: formatPercent(input.workTechnologyRatio),
    targetValue: `${input.targetPercent}%`,
    deviationScale: input.deviationScale,
    ...primaryAffectedObject(input.attentionRows),
    ...(boundedEvidenceSummary ? { evidenceSummary: boundedEvidenceSummary } : {}),
    createdFromDashboardAt: new Date().toISOString(),
  };
}
