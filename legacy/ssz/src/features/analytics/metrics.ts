import type { OperationRecord, SszRecord } from "../import/types";

export type GroupDimension = "department" | "master" | "status";

export interface Summary {
  sszCount: number;
  operationCount: number;
  problemSszCount: number;
  technologyTime: number;
  noTechnologyTime: number;
  noTechnologyRatio: number | null;
}

export interface GroupSummary {
  key: string;
  summary: Summary;
}

export interface OperationSummary {
  key: string;
  operationCount: number;
  noTechnologyTime: number;
  technologyTime: number;
  noTechnologyRatio: number | null;
}

export function ratioNoTechnology(technologyTime: number, noTechnologyTime: number): number | null {
  const total = technologyTime + noTechnologyTime;
  if (total <= 0) return null;
  return noTechnologyTime / total;
}

export function summarizeSszRecords(records: SszRecord[]): Summary {
  const technologyTime = records.reduce((sum, record) => sum + record.technologyTime, 0);
  const noTechnologyTime = records.reduce((sum, record) => sum + record.noTechnologyTime, 0);
  return {
    sszCount: records.length,
    operationCount: records.reduce((sum, record) => sum + record.operations.length, 0),
    problemSszCount: records.filter((record) => record.noTechnologyTime > 0).length,
    technologyTime,
    noTechnologyTime,
    noTechnologyRatio: ratioNoTechnology(technologyTime, noTechnologyTime),
  };
}

export function groupSszRecords(records: SszRecord[], dimension: GroupDimension): GroupSummary[] {
  const groups = new Map<string, SszRecord[]>();
  records.forEach((record) => {
    const key = record[dimension] || "Не заполнено";
    const group = groups.get(key);
    if (group) {
      group.push(record);
    } else {
      groups.set(key, [record]);
    }
  });

  return Array.from(groups.entries())
    .map(([key, grouped]) => ({ key, summary: summarizeSszRecords(grouped) }))
    .sort((left, right) => (right.summary.noTechnologyRatio ?? -1) - (left.summary.noTechnologyRatio ?? -1));
}

export function summarizeOperations(operations: OperationRecord[]): OperationSummary[] {
  const groups = new Map<string, OperationRecord[]>();
  operations.forEach((operation) => {
    const key = operation.operation || "Не заполнено";
    const group = groups.get(key);
    if (group) {
      group.push(operation);
    } else {
      groups.set(key, [operation]);
    }
  });

  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const technologyTime = rows.reduce((sum, row) => sum + row.technologyTime, 0);
      const noTechnologyTime = rows.reduce((sum, row) => sum + row.noTechnologyTime, 0);
      return {
        key,
        operationCount: rows.length,
        technologyTime,
        noTechnologyTime,
        noTechnologyRatio: ratioNoTechnology(technologyTime, noTechnologyTime),
      };
    })
    .sort((left, right) => right.noTechnologyTime - left.noTechnologyTime);
}

export function formatHours(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

export function formatPercent(value: number | null): string {
  if (value === null) return "н/д";
  return `${(value * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
