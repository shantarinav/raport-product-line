import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, CheckCircle2, Clock, FileSpreadsheet, LifeBuoy, UploadCloud } from "lucide-react";
import {
  DashboardHeader,
  ErrorState,
  FilterStatusBar,
  MetricCard,
  PageShell,
  SectionCard,
  DashboardSwitch,
} from "../../../shared/ui";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
import type { SupportFilters, SupportImportResult } from "../supportTypes";
import {
  applySupportFilters,
  buildDailySla,
  buildDataQualitySummary,
  buildMainInsight,
  buildOverdueTail,
  buildTopicSlaStats,
  calculateSupportKpis,
  formatSupportDateTime,
  formatSupportPercent,
  initialSupportFilters,
  overdueQuantiles,
  periodLabel,
  resolutionQuantiles,
} from "../logic/supportMetrics";
import { SupportDistributionCard } from "./SupportDistributionCard";
import { SupportDailySlaChart } from "./SupportDailySlaChart";
import { SupportTopicSlaMatrix } from "./SupportTopicSlaMatrix";
import { SupportOverdueTailTable } from "./SupportOverdueTailTable";
import { SupportDataQualityPanel } from "./SupportDataQualityPanel";
import { SupportFiltersPanel } from "./SupportFiltersPanel";
import { SUPPORT_THRESHOLDS } from "../supportConfig";

import { motion, AnimatePresence } from "motion/react";

const REPORT_ROUTE = "/support";

type SupportViewMode = "manager" | "analyst";
const SUPPORT_VIEW_MODE_STORAGE_KEY = "raport:support:viewMode";

function readStoredSupportViewMode(): SupportViewMode {
  if (typeof window === "undefined") return "manager";

  try {
    const stored = window.localStorage.getItem(SUPPORT_VIEW_MODE_STORAGE_KEY);
    return stored === "analyst" ? "analyst" : "manager";
  } catch {
    return "manager";
  }
}

function saveStoredSupportViewMode(mode: SupportViewMode) {
  try {
    window.localStorage.setItem(SUPPORT_VIEW_MODE_STORAGE_KEY, mode);
  } catch {}
}

function formatInteger(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function formatFilterDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function insightStatus(slaRate: number, applicableTickets: number, controlPercent: number) {
  if (applicableTickets === 0) {
    return {
      label: "Нет расчета SLA",
      className: "border-slate-300 bg-slate-50 text-slate-700",
    };
  }
  if (slaRate < controlPercent / 100) {
    return {
      label: "Критично",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (slaRate < SUPPORT_THRESHOLDS.healthySlaPercent / 100) {
    return {
      label: "Контроль",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return {
    label: "Норма",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatPercentageGap(value: number): string {
  return `${(value * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} п.п.`;
}

function normalizeControlPercent(value: number): number {
  return Math.max(0, Math.min(95, Math.round(value)));
}

function insightPoints(text: string): string[] {
  return text
    .split(".")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => `${item}.`);
}

export function SupportDashboardPage() {
  const navigate = useNavigate();
  const [report] = useState<SupportImportResult | null>(() => readPendingDashboardData<SupportImportResult>(REPORT_ROUTE));
  const [filters, setFilters] = useState<SupportFilters>(() => initialSupportFilters(report?.tickets ?? []));
  const [overdueTailLimit, setOverdueTailLimit] = useState(10);
  const [viewMode, setViewMode] = useState<SupportViewMode>(() => readStoredSupportViewMode());

  useEffect(() => {
    if (report) return;
    navigate("/", { replace: true, state: { statusNotice: "Данные техподдержки не найдены" } });
  }, [navigate, report]);

  const tickets = report?.tickets ?? [];
  const defaultFilters = useMemo(() => initialSupportFilters(tickets), [tickets]);
  const filteredTickets = useMemo(() => applySupportFilters(tickets, filters), [tickets, filters]);
  const kpis = useMemo(() => calculateSupportKpis(filteredTickets), [filteredTickets]);
  const resolution = useMemo(() => resolutionQuantiles(filteredTickets), [filteredTickets]);
  const overdue = useMemo(() => overdueQuantiles(filteredTickets), [filteredTickets]);
  const daily = useMemo(() => buildDailySla(filteredTickets), [filteredTickets]);
  const topicSla = useMemo(() => buildTopicSlaStats(filteredTickets), [filteredTickets]);
  const overdueTail = useMemo(() => buildOverdueTail(filteredTickets, overdueTailLimit), [filteredTickets, overdueTailLimit]);
  const dataQuality = useMemo(() => buildDataQualitySummary(filteredTickets, filters), [filteredTickets, filters]);
  const mainInsight = useMemo(() => buildMainInsight(kpis, overdue, resolution, filters.controlPercent), [kpis, overdue, resolution, filters.controlPercent]);
  const controlRatio = filters.controlPercent / 100;
  const attentionTopic = useMemo(
    () =>
      topicSla
        .filter((item) => item.applicable > 0 && item.slaRate < controlRatio)
        .sort((a, b) => a.slaRate - b.slaRate || b.overdue - a.overdue || b.total - a.total)[0],
    [topicSla, controlRatio],
  );

  if (!report) return null;

  function patchFilters(patch: Partial<SupportFilters>) {
    setFilters((current) => ({
      ...current,
      ...patch,
      ...(typeof patch.controlPercent === "number" ? { controlPercent: normalizeControlPercent(patch.controlPercent) } : {}),
    }));
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  function changeViewMode(mode: SupportViewMode) {
    setViewMode(mode);
    saveStoredSupportViewMode(mode);
  }

  const activePeriodLabel =
    filters.dateFrom && filters.dateTo
      ? `Период: ${formatFilterDate(filters.dateFrom)} - ${formatFilterDate(filters.dateTo)}`
      : filters.dateFrom
        ? `Период: с ${formatFilterDate(filters.dateFrom)}`
        : filters.dateTo
          ? `Период: по ${formatFilterDate(filters.dateTo)}`
          : "";
  const periodChanged = filters.dateFrom !== defaultFilters.dateFrom || filters.dateTo !== defaultFilters.dateTo;
  const chips = [
    activePeriodLabel
      ? {
          label: activePeriodLabel,
          ...(periodChanged ? { onRemove: () => patchFilters({ dateFrom: defaultFilters.dateFrom, dateTo: defaultFilters.dateTo }) } : {}),
        }
      : null,
    filters.slaStatus ? { label: filters.slaStatus, onRemove: () => patchFilters({ slaStatus: "" }) } : null,
    {
      label: `Цель контроля: ${filters.controlPercent}%`,
      ...(filters.controlPercent !== defaultFilters.controlPercent
        ? { onRemove: () => patchFilters({ controlPercent: defaultFilters.controlPercent }) }
        : {}),
    },
    filters.planBucket ? { label: `SLA: ${filters.planBucket}`, onRemove: () => patchFilters({ planBucket: "" }) } : null,
    filters.category ? { label: filters.category, onRemove: () => patchFilters({ category: "" }) } : null,
    filters.query ? { label: `Поиск: ${filters.query}`, onRemove: () => patchFilters({ query: "" }) } : null,
  ].filter(Boolean) as Array<{ label: string; onRemove?: () => void }>;
  const mainInsightStatus = insightStatus(kpis.slaRate, kpis.applicableTickets, filters.controlPercent);
  const mainInsightGap =
    kpis.applicableTickets === 0
      ? "отставание: н/д"
      : kpis.slaRate >= filters.controlPercent / 100
        ? `выше контроля на ${formatPercentageGap(kpis.slaRate - filters.controlPercent / 100)}`
        : `отставание: ${formatPercentageGap(filters.controlPercent / 100 - kpis.slaRate)}`;
  const mainInsightPoints = insightPoints(mainInsight);

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
        description="Анализ SLA заявок: где нарушены сроки и какие темы дают основной вклад"
        actions={(themeToggle) => (
          <div className="grid w-full min-w-0 max-w-[430px] justify-items-end gap-2 sm:min-w-[320px]">
            <div className="flex w-full items-center justify-end gap-2">
              <Link
                to="/"
                title="Заменить отчет"
                aria-label="Заменить отчет"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary transition-colors hover:bg-raport-action-bg-active"
              >
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
              </Link>
              {themeToggle}
            </div>
            <div className="w-full min-w-0 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs text-raport-muted">
              <p className="mb-1 truncate font-semibold text-raport-text" title={report.file.fileName}>{report.file.fileName}</p>
              <p className="truncate">
                {periodLabel(report.tickets)} · загружен {formatSupportDateTime(new Date(report.file.loadedAt))}
              </p>
            </div>
          </div>
        )}
      />

      {report.quality.missingRequiredColumns.length > 0 ? (
        <ErrorState className="mb-4" message={`В отчете техподдержки не найдены обязательные колонки: ${report.quality.missingRequiredColumns.join(", ")}`} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-3 lg:self-start">
          <SupportFiltersPanel
            filters={filters}
            dateMin={defaultFilters.dateFrom}
            dateMax={defaultFilters.dateTo}
            onChange={patchFilters}
            onReset={resetFilters}
            showAdvancedFilters={viewMode === "analyst"}
          />
        </div>

        <div className="grid gap-4 relative">
          <FilterStatusBar
            title="Активные фильтры"
            chips={chips.length > 0 ? chips : [{ label: "Все заявки", tone: "secondary" }]}
            actions={
              <DashboardSwitch
                value={viewMode}
                onChange={(value) => changeViewMode(value as SupportViewMode)}
                options={[
                  { value: "manager", label: "Руководитель" },
                  { value: "analyst", label: "Аналитик" },
                ]}
              />
            }
          />

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Всего заявок"
              value={formatInteger(kpis.totalTickets)}
              note={`с расчетом SLA: ${formatInteger(kpis.applicableTickets)} · без расчета: ${formatInteger(kpis.dataProblems)}`}
              Icon={LifeBuoy}
              tone="neutral"
            />
            <MetricCard label="SLA выполнен" value={formatSupportPercent(kpis.slaRate)} note={`${formatInteger(kpis.inSlaTickets)} из ${formatInteger(kpis.applicableTickets)}`} Icon={CheckCircle2} tone={kpis.slaRate >= controlRatio ? "success" : "warning"} />
            <MetricCard label="Просрочено" value={formatInteger(kpis.overdueTickets)} note={formatSupportPercent(kpis.overdueRate)} Icon={AlertTriangle} tone="danger" />
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {viewMode === "analyst" ? (
              <motion.div
                key="analyst-distributions"
                layout="position"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <SupportDistributionCard
                    title="Скорость решения"
                    description="Квартили времени решения по текущим фильтрам."
                    explanation="Медиана показывает типовое время решения, P90 — тяжелый хвост самых долгих заявок."
                    quantiles={resolution}
                    Icon={Clock}
                  />
                  <SupportDistributionCard
                    title="Длительность просрочки"
                    description="Квартили просрочки среди нарушенных SLA."
                    explanation="P90 показывает 10% самых тяжелых нарушений и помогает увидеть хвост просрочек."
                    quantiles={overdue}
                    Icon={BarChart3}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div layout="position" className="grid gap-4">
            <SectionCard title="Главный вывод" description="Статус SLA и основные причины задержек." Icon={FileSpreadsheet}>
              <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className={`rounded-control border px-4 py-3 ${mainInsightStatus.className}`}>
                  <span className="block text-xs font-extrabold uppercase tracking-[0.12em]">{mainInsightStatus.label}</span>
                  <strong className="mt-2 block text-3xl font-extrabold tabular-nums">{formatSupportPercent(kpis.slaRate)}</strong>
                  <span className="text-xs font-semibold">выполнение SLA</span>
                  <span className="mt-2 block text-xs font-semibold">цель контроля: {filters.controlPercent}%</span>
                  <span className="mt-1 block text-xs font-semibold">{mainInsightGap}</span>
                </div>
                <div className="grid gap-2 rounded-control border border-raport-border bg-white px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-raport-muted">Фокус контроля SLA</p>
                  {mainInsightPoints.map((point) => (
                    <div key={point} className="flex gap-2 text-sm font-semibold leading-relaxed text-raport-text">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-primary" />
                      <span>{point}</span>
                    </div>
                  ))}
                  {attentionTopic ? (
                    <div className="flex gap-2 text-sm font-semibold leading-relaxed text-raport-text">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-primary" />
                      <span>
                        Смотрите SLA по темам: зона внимания — {attentionTopic.category}, SLA {formatSupportPercent(attentionTopic.slaRate)}.
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <SupportDailySlaChart points={daily} controlPercent={filters.controlPercent} />

            <SupportTopicSlaMatrix rows={topicSla} controlPercent={filters.controlPercent} onCategorySelect={(category) => patchFilters({ category })} />
          </motion.div>

          <AnimatePresence mode="popLayout" initial={false}>
            {viewMode === "analyst" ? (
              <motion.div
                key="analyst-tables"
                layout="position"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full grid gap-4"
              >
                <SupportOverdueTailTable rows={overdueTail} limit={overdueTailLimit} onLimitChange={setOverdueTailLimit} />
                <SupportDataQualityPanel summary={dataQuality} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}
