import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, FileSpreadsheet, FileText, Gauge, Printer, Users } from "lucide-react";
import {
  ChartCard,
  DashboardHeader,
  DashboardSwitch,
  DataTable,
  FilterPanel,
  FilterStatusBar,
  MetricCard,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
import { isMonthlyCoverageReady, monthStartDateKey } from "../../../shared/lib/periodCoverage";
import {
  applyPrintFilters,
  buildPrintFilterOptions,
  buildRiskJobs,
  buildTopUsers,
  calculatePrintAnalytics,
  calculatePrintKpis,
  DEFAULT_TABLE_LIMITS,
  DEFAULT_TARIFFS,
  DOC_TYPES,
  estimateRowCost,
  formatDate,
  formatInteger,
  formatPercent,
  formatShortDateTime,
  initialPrintFilters,
  PAPER_BUCKETS,
  RISK_REASON_OPTIONS,
} from "../logic/dashboard";
import type { PaperBucket, PrintExcessSummary, PrintFilters, PrintImportResult, PrintJob, PrintKpis, PrintTariffs, PrintUserAggregate } from "../types";
import { usePrintHistory } from "../logic/usePrintHistory";
import {
  AutocompleteField,
  QuickFocusPanel,
  SortToolbar,
  USER_SORT_OPTIONS,
  quickFocusFromFilters,
  quickFocusLabel,
  type PrintQuickFocus,
  type UserSort,
} from "./PrintControls";
import { PrintPagesTrendChart } from "./PrintPagesTrendChart";
import { BarList, RiskJobList } from "./PrintWidgets";

const REPORT_ROUTE = "/print";

type TableLimits = typeof DEFAULT_TABLE_LIMITS;
type PrintViewMode = "manager" | "analyst";
type MetricDelta = {
  label: string;
  variant: "secondary" | "success" | "danger";
};

const PRINT_VIEW_MODE_STORAGE_KEY = "raport:print:viewMode";

function readStoredPrintViewMode(): PrintViewMode {
  if (typeof window === "undefined") return "manager";

  try {
    const storedMode = window.localStorage.getItem(PRINT_VIEW_MODE_STORAGE_KEY);
    return storedMode === "analyst" ? "analyst" : "manager";
  } catch {
    return "manager";
  }
}

function saveStoredPrintViewMode(mode: PrintViewMode) {
  try {
    window.localStorage.setItem(PRINT_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // The dashboard must keep working even if browser settings cannot be persisted.
  }
}

function tariffInputValue(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function parseTariffValue(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function isDate(value: Date | null): value is Date {
  return value instanceof Date;
}

function formatFilterDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function clampDateInput(value: string, min: string, max: string): string {
  if (!value) return value;
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

const deltaTextClass: Record<MetricDelta["variant"], string> = {
  secondary: "text-raport-muted",
  success: "text-raport-success",
  danger: "text-raport-danger",
};

function snapshotMetric(snapshot: { metrics: Record<string, number> } | null, key: string): number | null {
  const value = snapshot?.metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatSignedNumber(value: number, digits = 0): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "±";
  return `${sign}${Math.abs(value).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function metricDelta(currentValue: number, previousSnapshot: { metrics: Record<string, number> } | null, metricKey: string): MetricDelta | null {
  const previousValue = snapshotMetric(previousSnapshot, metricKey);
  if (previousValue === null) return null;
  const delta = currentValue - previousValue;

  return {
    label: formatSignedNumber(delta),
    variant: Math.abs(delta) < 0.5 ? "secondary" : delta > 0 ? "danger" : "success",
  };
}

function percentMetricDelta(currentValue: number, previousSnapshot: { metrics: Record<string, number> } | null, metricKey: string): MetricDelta | null {
  const previousValue = snapshotMetric(previousSnapshot, metricKey);
  if (previousValue === null) return null;
  const delta = currentValue - previousValue;

  return {
    label: `${formatSignedNumber(delta, 1)} п.п.`,
    variant: Math.abs(delta) < 0.05 ? "secondary" : delta > 0 ? "danger" : "success",
  };
}

function MetricNote({ label, delta, suffix = "" }: { label: string; delta: MetricDelta | null; suffix?: string }) {
  return (
    <div className="grid gap-1">
      <span>{label}</span>
      {delta ? (
        <span className={deltaTextClass[delta.variant]}>
          к предыдущему периоду: {delta.label}
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function printDeviationPages(kpis: PrintKpis): number {
  return Math.min(kpis.totalPages, kpis.simplexPages + kpis.colorPages + kpis.bigPages);
}

function printDeviationRatio(kpis: PrintKpis): number {
  return kpis.totalPages > 0 ? (printDeviationPages(kpis) / kpis.totalPages) * 100 : 0;
}

function hasPrintDeviation(row: PrintJob): boolean {
  return row.isBigJob || row.isMultiNoDuplex || row.isColor || row.isExcessPrint;
}

function printDeviationCost(rows: PrintJob[], tariffs: PrintTariffs): number {
  return rows.filter(hasPrintDeviation).reduce((total, row) => total + estimateRowCost(row, tariffs), 0);
}

function printInsightStatus(kpis: PrintKpis) {
  const ratio = printDeviationRatio(kpis);
  if (kpis.totalPages === 0) {
    return {
      label: "Нет данных",
      className: "border-slate-300 bg-slate-50 text-slate-700",
    };
  }
  if (ratio >= 35 || kpis.bigJobs >= 10) {
    return {
      label: "Критично",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (ratio >= 10 || kpis.simplexPages > 0 || kpis.colorPages > 0 || kpis.bigJobs > 0) {
    return {
      label: "Контроль",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "Норма",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function dominantPrintDeviation(kpis: PrintKpis, excessSummary: PrintExcessSummary): string {
  const deviations = [
    { label: "односторонняя печать", pages: kpis.simplexPages },
    { label: "цветная печать", pages: kpis.colorPages },
    { label: "задания от 100 стр.", pages: kpis.bigPages },
    { label: "потенциально избыточная печать", pages: excessSummary.pages },
  ].sort((left, right) => right.pages - left.pages);
  const top = deviations[0];
  return top && top.pages > 0 ? `Отклонение: ${top.label} — ${formatInteger(top.pages)} стр.` : "Отклонения: критичных объемов не найдено.";
}

function riskPriorityLabel(score: number): string {
  if (score >= 80) return "высокий";
  if (score >= 50) return "средний";
  return "низкий";
}

function printRiskInsight(row: PrintJob): string {
  return `Проверить задание: ${formatInteger(row.totalPages)} стр., ${row.riskReasons.map((reason) => reason.label).join(", ")}. Приоритет проверки — ${riskPriorityLabel(row.riskScore)}, балл ${formatInteger(row.riskScore)}.`;
}

function printInsightPoints(topUsers: PrintUserAggregate[], riskJobs: PrintJob[], kpis: PrintKpis, excessSummary: PrintExcessSummary): string[] {
  const topUser = topUsers[0];
  const riskJob = riskJobs[0];

  return [
    topUser
      ? `Пользователь: ${topUser.user} — ${formatInteger(topUser.pages)} стр., оценка ${formatInteger(topUser.cost)} руб.`
      : "Пользователь: нет данных по текущей выборке.",
    dominantPrintDeviation(kpis, excessSummary),
    riskJob ? printRiskInsight(riskJob) : "Риск-задания: критичных отклонений не найдено.",
  ];
}

export function PrintDashboardPage() {
  const navigate = useNavigate();
  const [report] = useState<PrintImportResult | null>(() => readPendingDashboardData<PrintImportResult>(REPORT_ROUTE));
  const [filters, setFilters] = useState<PrintFilters | null>(() => (report ? initialPrintFilters(report.jobs) : null));
  const [tariffs, setTariffs] = useState<PrintTariffs>(DEFAULT_TARIFFS);
  const [tableLimits, setTableLimits] = useState<TableLimits>(DEFAULT_TABLE_LIMITS);
  const [userSort, setUserSort] = useState<UserSort>("pages");
  const [riskSort, setRiskSort] = useState<"riskScore" | "totalPages">("riskScore");
  const [viewMode, setViewMode] = useState<PrintViewMode>(() => readStoredPrintViewMode());
  const { history: printHistory } = usePrintHistory();
  const hasHistoryChartData = printHistory.filter((snapshot) => snapshot.grain === "month" && snapshot.coverage?.isTrendReady === true && typeof snapshot.metrics.totalPages === "number" && Number.isFinite(snapshot.metrics.totalPages)).length >= 2;

  useEffect(() => {
    if (report) return;
    navigate("/", { replace: true, state: { statusNotice: "Данные Print не найдены" } });
  }, [navigate, report]);

  useEffect(() => {
    if (!report || filters) return;
    setFilters(initialPrintFilters(report.jobs));
  }, [filters, report]);

  const options = useMemo(() => buildPrintFilterOptions(report?.jobs ?? []), [report]);
  const filteredRows = useMemo(() => (report && filters ? applyPrintFilters(report.jobs, filters) : []), [filters, report]);
  const kpis = useMemo(() => calculatePrintKpis(filteredRows, tariffs), [filteredRows, tariffs]);
  const topUsers = useMemo(() => buildTopUsers(filteredRows, tariffs, userSort, tableLimits.users), [filteredRows, tariffs, userSort, tableLimits.users]);
  const { paperBars, docTypeBars, excessSummary } = useMemo(() => calculatePrintAnalytics(filteredRows), [filteredRows]);
  const riskJobs = useMemo(() => buildRiskJobs(filteredRows, riskSort, tableLimits.risk), [filteredRows, riskSort, tableLimits.risk]);
  const mainInsightStatus = printInsightStatus(kpis);
  const mainInsightPoints = useMemo(() => printInsightPoints(topUsers, riskJobs, kpis, excessSummary), [topUsers, riskJobs, kpis, excessSummary]);
  const mainInsightDeviationCost = useMemo(() => printDeviationCost(filteredRows, tariffs), [filteredRows, tariffs]);
  const previousSnapshot = useMemo(
    () => {
      if (!filters || !isMonthlyCoverageReady(filters.dateFrom, filters.dateTo)) return null;
      const comparisonMonthStart = monthStartDateKey(filters.dateFrom);
      if (!comparisonMonthStart) return null;

      return (
        printHistory
          .filter((snapshot) => snapshot.period.from < comparisonMonthStart)
          .sort((left, right) => right.period.from.localeCompare(left.period.from))[0] ?? null
      );
    },
    [filters, printHistory],
  );
  const totalPagesDelta = metricDelta(kpis.totalPages, previousSnapshot, "totalPages");
  const usersDelta = metricDelta(kpis.usersCount, previousSnapshot, "usersCount");
  const costDelta = metricDelta(kpis.estimatedCost, previousSnapshot, "estimatedCost");
  const simplexRatioDelta = percentMetricDelta(kpis.simplexRatio, previousSnapshot, "simplexRatioPercent");
  const colorRatioDelta = percentMetricDelta(kpis.colorRatio, previousSnapshot, "colorRatioPercent");
  const bigJobsDelta = metricDelta(kpis.bigJobs, previousSnapshot, "bigJobs");

  if (!report) return null;

  if (!filters) {
    return (
      <PageShell>
        <DashboardHeader
          title="Рапорт"
          description="Загрузка отчета Print."
          actions={
            <Link
              to="/"
              className="inline-flex min-h-8 items-center rounded-control border border-raport-action-border bg-raport-action-bg px-3 py-1.5 text-sm font-semibold text-raport-primary hover:bg-raport-action-bg-active"
            >
              Заменить отчет
            </Link>
          }
        />
        <SectionCard title="Подготовка Print" description="Данные отчета подготавливаются к отображению.">
          <p className="text-sm text-raport-muted">Пожалуйста, подождите.</p>
        </SectionCard>
      </PageShell>
    );
  }

  const reportJobs = report.jobs;
  const printDateBounds = initialPrintFilters(reportJobs);
  const resetFilters = () => setFilters(printDateBounds);
  const patchFilters = (next: Partial<PrintFilters>) => setFilters((current) => (current ? { ...current, ...next } : current));
  const isManagerView = viewMode === "manager";
  const reportDates = reportJobs.map((row) => row.date).filter(isDate);
  const period = reportDates.length
    ? {
        from: [...reportDates].sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
        to: [...reportDates].sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
      }
    : null;

  const quickFocus = quickFocusFromFilters(filters);

  function applyQuickFocus(value: PrintQuickFocus) {
    if (value === "all") {
      patchFilters({ color: "", duplex: "", riskReason: "" });
      return;
    }
    if (value === "simplex") {
      patchFilters({ duplex: "NOT DUPLEX", color: "", riskReason: "" });
      return;
    }
    if (value === "color") {
      patchFilters({ color: "NOT GRAYSCALE", duplex: "", riskReason: "" });
      return;
    }
    if (value === "bigJobs") {
      patchFilters({ riskReason: "big-job", color: "", duplex: "" });
      return;
    }
    if (value === "pdfIncluded") {
      patchFilters({ excludePdfPrinter: false });
      return;
    }
    patchFilters({ excludePdfPrinter: true });
  }

  function changeViewMode(nextMode: PrintViewMode) {
    setViewMode(nextMode);
    saveStoredPrintViewMode(nextMode);
    if (nextMode === "manager") {
      const defaultPrintFilters = initialPrintFilters(reportJobs);
      setFilters((current) =>
        current
          ? {
              ...current,
              computer: "",
              documentText: "",
              docType: "",
              paperBuckets: defaultPrintFilters.paperBuckets,
            }
          : current,
      );
    }
  }

  const chips = [
    { label: `Период: ${filters.dateFrom ? formatFilterDate(filters.dateFrom) : "начало"} - ${filters.dateTo ? formatFilterDate(filters.dateTo) : "конец"}` },
    ...(quickFocus !== "all" ? [{ label: `Фокус: ${quickFocusLabel(quickFocus)}`, onRemove: () => applyQuickFocus("all") }] : []),
    ...(filters.excludePdfPrinter ? [{ label: "PDF-принтер исключен" }] : [{ label: "PDF-принтер включен", tone: "secondary" as const }]),
    ...(filters.user ? [{ label: `Пользователь: ${filters.user}`, onRemove: () => patchFilters({ user: "" }) }] : []),
    ...(filters.computer ? [{ label: `Компьютер: ${filters.computer}`, onRemove: () => patchFilters({ computer: "" }) }] : []),
    ...(filters.documentText ? [{ label: `Документ: ${filters.documentText}`, onRemove: () => patchFilters({ documentText: "" }) }] : []),
    ...(filters.docType ? [{ label: `Тип: ${filters.docType}`, onRemove: () => patchFilters({ docType: "" }) }] : []),
    ...(filters.color ? [{ label: filters.color === "NOT GRAYSCALE" ? "Цветная" : "Черно-белая", onRemove: () => patchFilters({ color: "" }) }] : []),
    ...(filters.duplex ? [{ label: filters.duplex === "DUPLEX" ? "Двусторонняя" : "Односторонняя", onRemove: () => patchFilters({ duplex: "" }) }] : []),
    ...(filters.riskReason ? [{ label: RISK_REASON_OPTIONS.find((item) => item.value === filters.riskReason)?.label ?? filters.riskReason, onRemove: () => patchFilters({ riskReason: "" }) }] : []),
  ];

  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FileSpreadsheet className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-slate-900 md:text-3xl">Рапорт</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Анализ печати: страницы, пользователи, форматы бумаги, типы документов и задания с отклонениями."
        actions={(themeToggle) => (
          <div className="grid w-full min-w-0 max-w-[430px] justify-items-end gap-2 sm:min-w-[320px]">
            <div className="flex w-full items-center justify-end gap-2">
              <Link
                to="/"
                className="inline-flex min-h-8 items-center rounded-control border border-raport-action-border bg-raport-action-bg px-3 py-1.5 text-sm font-semibold text-raport-primary hover:bg-raport-action-bg-active"
              >
                Заменить отчет
              </Link>
              {themeToggle}
            </div>
            <div className="w-full min-w-0 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs text-raport-muted">
              <p className="mb-1 truncate font-semibold text-raport-text" title={report.file.fileName}>
                {report.file.fileName}
              </p>
              <p className="truncate">
                {period?.from && period?.to ? `${formatDate(period.from)} - ${formatDate(period.to)}` : "Период не определен"} · загружен{" "}
                {formatShortDateTime(report.file.loadedAt)}
              </p>
            </div>
          </div>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-3 lg:self-start">
          <FilterPanel onReset={resetFilters}>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Период с</span>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  min={printDateBounds.dateFrom}
                  max={printDateBounds.dateTo}
                  onChange={(event) => patchFilters({ dateFrom: clampDateInput(event.target.value, printDateBounds.dateFrom, printDateBounds.dateTo) })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Период по</span>
                <Input
                  type="date"
                  value={filters.dateTo}
                  min={printDateBounds.dateFrom}
                  max={printDateBounds.dateTo}
                  onChange={(event) => patchFilters({ dateTo: clampDateInput(event.target.value, printDateBounds.dateFrom, printDateBounds.dateTo) })}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Пользователь</span>
                <AutocompleteField
                  value={filters.user}
                  onChange={(value) => patchFilters({ user: value })}
                  placeholder="Все пользователи"
                  options={options.users}
                  ariaLabel="Фильтр по пользователю"
                />
              </label>

              {!isManagerView ? (
                <label className="grid gap-1">
                  <span className="text-xs text-raport-muted">Компьютер</span>
                  <AutocompleteField
                    value={filters.computer}
                    onChange={(value) => patchFilters({ computer: value })}
                    placeholder="Все компьютеры"
                    options={options.computers}
                    ariaLabel="Фильтр по компьютеру"
                  />
                </label>
              ) : null}

              {!isManagerView ? (
                <label className="grid gap-1">
                  <span className="text-xs text-raport-muted">Документ</span>
                  <Input value={filters.documentText} placeholder="Фрагмент названия" onChange={(event) => patchFilters({ documentText: event.target.value })} />
                </label>
              ) : null}

              <QuickFocusPanel value={quickFocus} onChange={applyQuickFocus} />

              {!isManagerView ? (
              <details className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
                <summary className="cursor-pointer select-none text-xs font-semibold text-raport-muted">Дополнительно</summary>
                <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Тип документа</span>
                <Select value={filters.docType} onChange={(event) => patchFilters({ docType: event.target.value })}>
                  <option value="">Все типы</option>
                  {DOC_TYPES.filter((type) => options.docTypes.includes(type)).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Цветность</span>
                <Select value={filters.color} onChange={(event) => patchFilters({ color: event.target.value })}>
                  <option value="">Любая</option>
                  <option value="GRAYSCALE">Черно-белая</option>
                  <option value="NOT GRAYSCALE">Цветная</option>
                </Select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Двусторонняя печать</span>
                <Select value={filters.duplex} onChange={(event) => patchFilters({ duplex: event.target.value })}>
                  <option value="">Все режимы</option>
                  <option value="DUPLEX">Двусторонняя</option>
                  <option value="NOT DUPLEX">Односторонняя</option>
                </Select>
              </label>

              <div className="grid gap-2">
                <span className="text-xs text-raport-muted">Формат бумаги</span>
                <div className="grid gap-1">
                  {PAPER_BUCKETS.map((bucket) => (
                    <label key={bucket} className="flex items-center gap-2 rounded-control border border-raport-border bg-white px-2 py-1 text-xs font-semibold text-raport-text">
                      <input
                        type="checkbox"
                        checked={filters.paperBuckets.includes(bucket)}
                        onChange={(event) => {
                          const next = event.target.checked ? [...filters.paperBuckets, bucket] : filters.paperBuckets.filter((item) => item !== bucket);
                          patchFilters({ paperBuckets: next as PaperBucket[] });
                        }}
                      />
                      <span>{bucket}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Причина отклонения</span>
                <Select value={filters.riskReason} onChange={(event) => patchFilters({ riskReason: event.target.value })}>
                  <option value="">Все причины</option>
                  {RISK_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex items-start gap-2 rounded-control border border-raport-border bg-white px-2 py-2 text-xs text-raport-muted">
                <input type="checkbox" checked={filters.excludePdfPrinter} onChange={(event) => patchFilters({ excludePdfPrinter: event.target.checked })} />
                <span>
                  <strong className="block text-raport-text">Исключить печать в PDF</strong>
                  Принтер Microsoft Print to PDF
                </span>
              </label>
                </div>
              </details>
              ) : null}

              {!isManagerView ? (
              <details className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
                <summary className="cursor-pointer select-none text-xs font-semibold text-raport-muted">Тарифы</summary>
                <div className="mt-2 grid gap-2">
                  {[
                    ["bwRate", "Ч/б страница, руб."],
                    ["colorRate", "Цветная страница, руб."],
                    ["simplexRate", "Односторонняя, коэффициент"],
                    ["duplexRate", "Двусторонняя, коэффициент"],
                  ].map(([key, label]) => (
                    <label key={key} className="grid gap-1">
                      <span className="text-[11px] text-raport-muted">{label}</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={tariffInputValue(tariffs[key as keyof PrintTariffs])}
                        onChange={(event) => setTariffs((current) => ({ ...current, [key]: parseTariffValue(event.target.value) }))}
                      />
                    </label>
                  ))}
                </div>
              </details>
              ) : null}
            </div>
          </FilterPanel>
        </div>

        <div className="grid gap-4 relative">
          <FilterStatusBar
            chips={chips}
            actions={
              <DashboardSwitch
                value={viewMode}
                onChange={(value) => changeViewMode(value as PrintViewMode)}
                options={[
                  { value: "manager", label: "Руководитель" },
                  { value: "analyst", label: "Аналитик" },
                ]}
              />
            }
          />

          <motion.div layout className="grid gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {!isManagerView ? (
                <motion.div
                  key="analyst-kpi-title"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-raport-muted">Объем и стоимость</p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div layout className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Всего страниц"
                value={formatInteger(kpis.totalPages)}
                note={<MetricNote label={`${formatInteger(kpis.totalJobs)} заданий`} delta={totalPagesDelta} suffix=" стр." />}
                Icon={Printer}
                tone="neutral"
              />
              <MetricCard
                label="Уникальные пользователи"
                value={formatInteger(kpis.usersCount)}
                note={<MetricNote label="в текущей выборке" delta={usersDelta} />}
                Icon={Users}
                tone="neutral"
              />
              <MetricCard
                label="Оценка стоимости"
                value={formatInteger(kpis.estimatedCost)}
                note={<MetricNote label="руб." delta={costDelta} suffix=" руб." />}
                Icon={Printer}
                tone="success"
              />
            </motion.div>

            <AnimatePresence mode="popLayout" initial={false}>
              {!isManagerView ? (
                <motion.div
                  key="analyst-deviations"
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full grid gap-2"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-raport-muted mt-2">Отклонения печати</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      label="Односторонняя печать"
                      value={formatPercent(kpis.simplexRatio)}
                      note={<MetricNote label={`${formatInteger(kpis.simplexPages)} страниц`} delta={simplexRatioDelta} />}
                      Icon={FileText}
                      tone="warning"
                    />
                    <MetricCard
                      label="Цветная печать"
                      value={formatPercent(kpis.colorRatio)}
                      note={<MetricNote label={`${formatInteger(kpis.colorPages)} страниц`} delta={colorRatioDelta} />}
                      Icon={Gauge}
                      tone="warning"
                    />
                    <MetricCard
                      label="Задания от 100 стр."
                      value={formatInteger(kpis.bigJobs)}
                      note={<MetricNote label={`${formatInteger(kpis.bigPages)} страниц`} delta={bigJobsDelta} />}
                      Icon={AlertTriangle}
                      tone="danger"
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <motion.div layout>
            <SectionCard title="Главный вывод" description="Короткая управленческая интерпретация текущей выборки." Icon={Printer}>

            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className={`rounded-control border px-4 py-3 ${mainInsightStatus.className}`}>
                <span className="block text-xs font-extrabold uppercase tracking-[0.12em]">{mainInsightStatus.label}</span>
                <strong className="mt-2 block text-3xl font-extrabold tabular-nums">{formatPercent(printDeviationRatio(kpis))}</strong>
                <span className="text-xs font-semibold">страниц с отклонениями</span>
                <span className="mt-1 block text-xs font-semibold">оценка отклонений: {formatInteger(mainInsightDeviationCost)} руб.</span>
              </div>
              <div className="grid gap-2 rounded-control border border-raport-border bg-white px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-raport-muted">Что проверить в первую очередь</p>
                {mainInsightPoints.map((point) => (
                  <div key={point} className="flex gap-2 text-sm font-semibold leading-relaxed text-raport-text">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-primary" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
          </motion.div>

          <AnimatePresence mode="popLayout" initial={false}>
            {viewMode === "analyst" && hasHistoryChartData ? (
              <motion.div key="analyst-history" layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="w-full">
                <PrintPagesTrendChart data={printHistory} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            {filteredRows.length === 0 ? (
              <motion.div key="filtered-empty" layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full">
                <SectionCard title="Нет данных" description="По выбранным фильтрам заданий нет.">
                  <p className="text-sm text-raport-muted">Измените параметры или нажмите «Сбросить».</p>
                </SectionCard>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div layout>
          <SectionCard title="Топ пользователей по страницам"
            description="Рейтинг пользователей в текущей выборке."
            Icon={Users}
          >
            <SortToolbar
              sortValue={userSort}
              sortOptions={USER_SORT_OPTIONS}
              onSortChange={(value) => setUserSort(value as UserSort)}
              limitValue={String(tableLimits.users)}
              onLimitChange={(value) => setTableLimits((current) => ({ ...current, users: Number(value) }))}
            />
            <DataTable
              rows={topUsers.map((row, index) => ({ ...row, rank: index + 1 }))}
              rowKey={(row) => row.user}
              columns={[
                {
                  key: "rank",
                  header: "#",
                  cell: (row) => (
                    <span className="inline-flex min-h-6 min-w-8 items-center justify-center rounded-full border border-raport-action-border bg-raport-action-bg px-2 text-xs font-extrabold tabular-nums text-raport-primary">
                      #{row.rank}
                    </span>
                  ),
                  className: "w-12 whitespace-nowrap",
                },
                { key: "user", header: "Пользователь", cell: (row) => <button className="max-w-[220px] truncate text-left font-semibold text-raport-primary hover:underline" onClick={() => patchFilters({ user: row.user })}>{row.user}</button> },
                { key: "pages", header: "Стр.", cell: (row) => formatInteger(row.pages), className: "text-right tabular-nums" },
                { key: "cost", header: "Оценка, руб", cell: (row) => formatInteger(row.cost), className: "text-right tabular-nums" },
                { key: "noDuplexPages", header: "Без двуст.", cell: (row) => formatInteger(row.noDuplexPages), className: "text-right tabular-nums" },
                { key: "colorPages", header: "Цвет", cell: (row) => formatInteger(row.colorPages), className: "text-right tabular-nums" },
                { key: "bigJobs", header: "100+", cell: (row) => formatInteger(row.bigJobs), className: "text-right tabular-nums" },
              ]}
            />
          </SectionCard>
        </motion.div>

        <AnimatePresence mode="popLayout" initial={false}>
            {!isManagerView ? (
              <motion.div key="analyst-tables" layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Тип документа" description="Распределение напечатанных страниц по типам документов." Icon={FileText}>
                  <BarList items={docTypeBars} />
                </ChartCard>
                <ChartCard title="Формат бумаги" description="Распределение страниц по формату бумаги." Icon={Printer}>
                  <BarList items={paperBars} />
                </ChartCard>
              </div>

              <SectionCard title="Потенциально избыточная печать" description="Личные тематики, нормативные документы и служебные записки." Icon={AlertTriangle}>
                <div className="mb-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-control border border-raport-border bg-white px-3 py-2">
                    <strong className="block text-xl font-extrabold text-raport-text">{formatInteger(excessSummary.jobs)}</strong>
                    <span className="text-xs font-semibold text-raport-muted">заданий</span>
                  </div>
                  <div className="rounded-control border border-raport-border bg-white px-3 py-2">
                    <strong className="block text-xl font-extrabold text-raport-text">{formatInteger(excessSummary.pages)}</strong>
                    <span className="text-xs font-semibold text-raport-muted">страниц</span>
                  </div>
                  <div className="rounded-control border border-raport-border bg-white px-3 py-2">
                    <strong className="block text-xl font-extrabold text-raport-text">{formatInteger(excessSummary.users)}</strong>
                    <span className="text-xs font-semibold text-raport-muted">пользователей</span>
                  </div>
                </div>
                <BarList items={excessSummary.categories} />
              </SectionCard>
            
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div layout>
            <SectionCard
              title="Топ заданий с отклонениями"
              description="Сортировка по баллу риска или по объему страниц."
              Icon={AlertTriangle}
            >
              <SortToolbar
                sortValue={riskSort}
                sortOptions={[
                  { value: "riskScore", label: "Балл" },
                  { value: "totalPages", label: "Страницы" },
                ]}
                onSortChange={(value) => setRiskSort(value as "riskScore" | "totalPages")}
                limitValue={String(tableLimits.risk)}
                onLimitChange={(value) => setTableLimits((current) => ({ ...current, risk: Number(value) }))}
              />
              <RiskJobList rows={riskJobs} onUserSelect={(user) => patchFilters({ user })} />
            </SectionCard>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}
