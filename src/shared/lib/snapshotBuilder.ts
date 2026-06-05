import { kpiData, operationDateKey } from "../../features/ssz/logic/dashboard";
import type { ImportedReport, OperationRecord, SszRecord } from "../../features/ssz/import/types";
import { buildAgreementFacts, calculateAgreementKpis } from "../../features/tessa/logic/dashboard";
import type { NormalizedRecord, TessaImportResult } from "../../features/tessa/types";
import { calculatePrintKpis, DEFAULT_TARIFFS } from "../../features/print/logic/dashboard";
import type { PrintImportResult, PrintJob } from "../../features/print/types";
import { calculateSupportKpis, overdueQuantiles, resolutionQuantiles } from "../../features/support/logic/supportMetrics";
import type { SupportImportResult, SupportQuantiles, SupportTicket } from "../../features/support/supportTypes";
import type { DashboardSnapshot, DashboardType } from "./historyDB";

export type SnapshotReportMatch = "ССЗ" | "Tessa" | "Print" | "Техподдержка";

export type SnapshotInput = ImportedReport | TessaImportResult | PrintImportResult | SupportImportResult;

type Period = {
  from: string;
  to: string;
};

type MonthlyGroup<T> = {
  items: T[];
  dateKeys: Set<string>;
};

const MATCH_TO_DASHBOARD_TYPE: Record<SnapshotReportMatch, DashboardType> = {
  ССЗ: "ssz",
  Tessa: "tessa",
  Print: "print",
  Техподдержка: "support",
};

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1000) / 1000;
}

function percentage(value: number | null): number {
  return value === null ? 0 : roundMetric(value * 100);
}

function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value: string | null | undefined): string {
  return value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
}

function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function daysInMonth(monthKey: string): number {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 0;
  return new Date(year, month, 0).getDate();
}

function monthPeriod(monthKey: string): Period | null {
  const monthDays = daysInMonth(monthKey);
  if (monthDays <= 0) return null;
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(monthDays).padStart(2, "0")}`,
  };
}

function groupByMonth<T>(items: T[], getDateKey: (item: T) => string): Map<string, MonthlyGroup<T>> {
  const groups = new Map<string, MonthlyGroup<T>>();

  items.forEach((item) => {
    const dateKey = normalizeDateKey(getDateKey(item));
    if (!dateKey) return;
    const monthKey = monthKeyFromDateKey(dateKey);
    const group = groups.get(monthKey) ?? { items: [], dateKeys: new Set<string>() };
    group.items.push(item);
    group.dateKeys.add(dateKey);
    groups.set(monthKey, group);
  });

  return groups;
}

function buildMonthlySnapshots<T>({
  dashboardType,
  items,
  getDateKey,
  buildMetrics,
}: {
  dashboardType: DashboardType;
  items: T[];
  getDateKey: (item: T) => string;
  buildMetrics: (items: T[]) => Record<string, number>;
}): DashboardSnapshot[] {
  const savedAt = new Date().toISOString();
  const groups = groupByMonth(items, getDateKey);

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map<DashboardSnapshot | null>(([monthKey, group]) => {
      const period = monthPeriod(monthKey);
      if (!period) return null;

      const actualDateKeys = Array.from(group.dateKeys).sort();
      const coveredDays = actualDateKeys.length;
      const periodDays = daysInMonth(monthKey);
      const coverageRatio = periodDays > 0 ? coveredDays / periodDays : 0;

      return {
        id: `${dashboardType}::${monthKey}`,
        dashboardType,
        grain: "month",
        period,
        coverage: {
          from: actualDateKeys[0] ?? period.from,
          to: actualDateKeys[actualDateKeys.length - 1] ?? period.to,
          days: coveredDays,
          periodDays,
          ratio: roundMetric(coverageRatio),
          isTrendReady: coverageRatio >= 0.5,
        },
        meta: {
          savedAt,
        },
        metrics: buildMetrics(group.items),
      } satisfies DashboardSnapshot;
    })
    .filter((snapshot): snapshot is DashboardSnapshot => snapshot !== null);
}


function buildSszSnapshotMetrics(records: SszRecord[], operations: OperationRecord[]): Record<string, number> {
  const kpis = kpiData(records, operations);
  const technologyHours = records.reduce((sum, record) => sum + record.technologyTime, 0);
  const noTechnologyHours = records.reduce((sum, record) => sum + record.noTechnologyTime, 0);

  return {
    sszCount: records.length,
    operationCount: operations.length,
    workTechnologyPercent: percentage(kpis.workTechnologyRatio),
    operationTechnologyPercent: percentage(kpis.operationTechnologyRatio),
    technologyHours: roundMetric(technologyHours),
    noTechnologyHours: roundMetric(noTechnologyHours),
    totalHours: roundMetric(technologyHours + noTechnologyHours),
  };
}

function buildSszMonthlySnapshots(report: ImportedReport): DashboardSnapshot[] {
  const savedAt = new Date().toISOString();
  const groups = new Map<string, MonthlyGroup<SszRecord> & { operations: OperationRecord[] }>();

  report.sszRecords.forEach((record) => {
    const operationsByMonth = new Map<string, OperationRecord[]>();

    record.operations.forEach((operation) => {
      const dateKey = normalizeDateKey(operationDateKey(operation.sszDate));
      if (!dateKey) return;

      const monthKey = monthKeyFromDateKey(dateKey);
      const operations = operationsByMonth.get(monthKey) ?? [];
      operations.push(operation);
      operationsByMonth.set(monthKey, operations);
    });

    operationsByMonth.forEach((operations, monthKey) => {
      const group = groups.get(monthKey) ?? { items: [], operations: [], dateKeys: new Set<string>() };
      const technologyTime = operations.reduce((sum, operation) => sum + operation.technologyTime, 0);
      const noTechnologyTime = operations.reduce((sum, operation) => sum + operation.noTechnologyTime, 0);

      group.items.push({
        ...record,
        operations,
        technologyTime,
        noTechnologyTime,
      });
      group.operations.push(...operations);
      operations.forEach((operation) => {
        const dateKey = normalizeDateKey(operationDateKey(operation.sszDate));
        if (dateKey) group.dateKeys.add(dateKey);
      });
      groups.set(monthKey, group);
    });
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map<DashboardSnapshot | null>(([monthKey, group]) => {
      const period = monthPeriod(monthKey);
      if (!period) return null;

      const actualDateKeys = Array.from(group.dateKeys).sort();
      const coveredDays = actualDateKeys.length;
      const periodDays = daysInMonth(monthKey);
      const coverageRatio = periodDays > 0 ? coveredDays / periodDays : 0;

      return {
        id: `ssz::${monthKey}`,
        dashboardType: "ssz",
        grain: "month",
        period,
        coverage: {
          from: actualDateKeys[0] ?? period.from,
          to: actualDateKeys[actualDateKeys.length - 1] ?? period.to,
          days: coveredDays,
          periodDays,
          ratio: roundMetric(coverageRatio),
          isTrendReady: coverageRatio >= 0.5,
        },
        meta: {
          savedAt,
        },
        metrics: buildSszSnapshotMetrics(group.items, group.operations),
      };
    })
    .filter((snapshot): snapshot is DashboardSnapshot => snapshot !== null);
}

function buildTessaSnapshotMetrics(records: NormalizedRecord[]): Record<string, number> {
  const facts = buildAgreementFacts(records, new Date());
  const kpis = calculateAgreementKpis(facts);

  return {
    recordCount: records.length,
    open: kpis.open,
    stuck: kpis.stuck,
    riskToday: kpis.riskToday,
    riskWeek: kpis.riskWeek,
    criticalOver30: kpis.criticalOver30,
    maxStuckDays: roundMetric(kpis.maxStuckDays),
    stuckRatePercent: roundMetric(kpis.stuckRate),
    attentionPeople: kpis.attentionPeople,
  };
}

function buildTessaMonthlySnapshots(report: TessaImportResult): DashboardSnapshot[] {
  return buildMonthlySnapshots<NormalizedRecord>({
    dashboardType: "tessa",
    items: report.records,
    getDateKey: (record) => (record.documentDate ? dateToKey(record.documentDate) : ""),
    buildMetrics: buildTessaSnapshotMetrics,
  });
}

function buildPrintSnapshotMetrics(jobs: PrintJob[]): Record<string, number> {
  const metricJobs = jobs.filter((job) => !job.isPdfPrinter);
  const kpis = calculatePrintKpis(metricJobs, DEFAULT_TARIFFS);

  return {
    totalPages: kpis.totalPages,
    totalJobs: kpis.totalJobs,
    simplexPages: kpis.simplexPages,
    simplexRatioPercent: roundMetric(kpis.simplexRatio),
    colorPages: kpis.colorPages,
    colorRatioPercent: roundMetric(kpis.colorRatio),
    bigJobs: kpis.bigJobs,
    bigPages: kpis.bigPages,
    usersCount: kpis.usersCount,
    estimatedCost: roundMetric(kpis.estimatedCost),
  };
}

function buildPrintMonthlySnapshots(report: PrintImportResult): DashboardSnapshot[] {
  return buildMonthlySnapshots<PrintJob>({
    dashboardType: "print",
    items: report.jobs,
    getDateKey: (job) => job.dateKey,
    buildMetrics: buildPrintSnapshotMetrics,
  });
}

function quantileMetrics(prefix: string, quantiles: SupportQuantiles): Record<string, number> {
  return {
    [`${prefix}Q1Hours`]: roundMetric(quantiles.q1 ?? 0),
    [`${prefix}Q2Hours`]: roundMetric(quantiles.q2 ?? 0),
    [`${prefix}Q3Hours`]: roundMetric(quantiles.q3 ?? 0),
    [`${prefix}P90Hours`]: roundMetric(quantiles.p90 ?? 0),
  };
}

function buildSupportSnapshotMetrics(tickets: SupportTicket[]): Record<string, number> {
  const kpis = calculateSupportKpis(tickets);

  return {
    totalTickets: kpis.totalTickets,
    applicableTickets: kpis.applicableTickets,
    inSlaTickets: kpis.inSlaTickets,
    overdueTickets: kpis.overdueTickets,
    dataProblems: kpis.dataProblems,
    slaRatePercent: roundMetric(kpis.slaRate * 100),
    overdueRatePercent: roundMetric(kpis.overdueRate * 100),
    ...quantileMetrics("resolution", resolutionQuantiles(tickets)),
    ...quantileMetrics("overdue", overdueQuantiles(tickets)),
  };
}

function buildSupportMonthlySnapshots(report: SupportImportResult): DashboardSnapshot[] {
  return buildMonthlySnapshots<SupportTicket>({
    dashboardType: "support",
    items: report.tickets,
    getDateKey: (ticket) => (ticket.createdAt ? dateToKey(ticket.createdAt) : ""),
    buildMetrics: buildSupportSnapshotMetrics,
  });
}

export function buildSnapshotData(match: SnapshotReportMatch, parsedData: SnapshotInput): DashboardSnapshot[] {
  const dashboardType = MATCH_TO_DASHBOARD_TYPE[match];

  if (dashboardType === "ssz") return buildSszMonthlySnapshots(parsedData as ImportedReport);
  if (dashboardType === "tessa") return buildTessaMonthlySnapshots(parsedData as TessaImportResult);
  if (dashboardType === "print") return buildPrintMonthlySnapshots(parsedData as PrintImportResult);
  return buildSupportMonthlySnapshots(parsedData as SupportImportResult);
}

