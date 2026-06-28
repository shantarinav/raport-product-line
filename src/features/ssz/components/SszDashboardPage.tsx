import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Factory, FileSpreadsheet, Gauge, UploadCloud, Users, Wrench } from "lucide-react";

import {
  DashboardHeader,
  DashboardHeaderMark,
  DashboardSwitch,
  FilterPanel,
  FilterStatusBar,
  HeaderIconButton,
  HelpLink,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
import { isMonthlyCoverageReady, monthStartDateKey } from "../../../shared/lib/periodCoverage";
import type { LocalA3DraftInput } from "../../local-a3/localA3Commands";
import { A3DashboardDraftPanel } from "../../local-a3/components/A3DashboardDraftPanel";
import { A3ReviewButton } from "../../local-a3/components/A3ReviewButton";
import { createA3DraftFromDeviation } from "../../local-a3/dashboardDeviation";
import { localA3Repository } from "../../local-a3/localA3Repository";
import type { LocalA3Protocol } from "../../local-a3/localA3Types";
import { formatImportedAt, formatReportPeriod } from "../import/periodDisplay";
import type { ImportedReport, OperationRecord } from "../import/types";
import {
  applyDepartmentSelection,
  applyMasterSelection,
  applyOrderSelection,
  dateBounds,
  filterOperations,
  filterRecords,
  formatDateChip,
  groupContributions,
  initialFilters,
  kpiData,
  normalizedText,
  operationScope,
  type ContributionRow,
  type DashboardFilters,
  uniqueSorted,
} from "../logic/dashboard";
import { mapSszTechnologyDeviationToA3Deviation } from "../logic/a3Draft";
import { summarizeSszRelatedTechnologyA3 } from "../logic/a3Related";
import { formatHours, formatPercent } from "../logic/format";
import { useSSZHistory } from "../logic/useSSZHistory";
import { SSZTrendChart } from "./SSZTrendChart";
import { MasterLeaderboardCard, SszKpiCards, TechnologyBoardCard, leaderboardRows, targetTone } from "./SszCards";
import { AutocompleteField, TargetControl } from "./SszControls";

type SszViewMode = "manager" | "analyst";

const SSZ_VIEW_MODE_STORAGE_KEY = "raport:ssz:viewMode";

function readStoredSszViewMode(): SszViewMode {
  if (typeof window === "undefined") return "manager";

  try {
    const storedMode = window.localStorage.getItem(SSZ_VIEW_MODE_STORAGE_KEY);
    return storedMode === "analyst" ? "analyst" : "manager";
  } catch {
    return "manager";
  }
}

function saveStoredSszViewMode(mode: SszViewMode) {
  try {
    window.localStorage.setItem(SSZ_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures: the dashboard should keep working without persisted UI preferences.
  }
}

function SszFilterSidebar({
  operations,
  filters,
  viewMode,
  onChange,
  onReset,
}: {
  operations: OperationRecord[];
  filters: DashboardFilters;
  viewMode: SszViewMode;
  onChange: (filters: DashboardFilters) => void;
  onReset: () => void;
}) {
  const bounds = useMemo(() => dateBounds(operations), [operations]);
  const showOrderFilters = viewMode === "analyst";

  const orderContextOperations = useMemo(
    () =>
      filterOperations(operations, {
        ...filters,
        selectedOrder: "",
        selectedKit: "",
      }),
    [operations, filters],
  );

  const peopleContextOperations = useMemo(
    () =>
      filterOperations(operations, {
        ...filters,
        selectedDepartment: "",
        selectedMaster: "",
      }),
    [operations, filters],
  );

  const orders = useMemo(() => uniqueSorted(orderContextOperations.map((operation) => operation.product)), [orderContextOperations]);

  const visibleOrders = useMemo(() => {
    const query = filters.selectedOrder.trim().toLocaleLowerCase("ru");
    if (!query) return orders;
    return orders.filter((order) => order.toLocaleLowerCase("ru").includes(query));
  }, [filters.selectedOrder, orders]);

  const kits = useMemo(
    () =>
      uniqueSorted(
        filterOperations(operations, {
          ...filters,
          selectedKit: "",
        })
          .filter((operation) => normalizedText(operation.product) === normalizedText(filters.selectedOrder))
          .map((operation) => operation.kit),
      ),
    [operations, filters],
  );

  const departments = useMemo(
    () =>
      uniqueSorted(
        peopleContextOperations
          .filter((operation) => !filters.selectedMaster || normalizedText(operation.master) === normalizedText(filters.selectedMaster))
          .map((operation) => operation.department),
      ),
    [filters.selectedMaster, peopleContextOperations],
  );

  const masters = useMemo(
    () =>
      uniqueSorted(
        peopleContextOperations
          .filter(
            (operation) =>
              !filters.selectedDepartment || normalizedText(operation.department) === normalizedText(filters.selectedDepartment),
          )
          .map((operation) => operation.master),
      ),
    [filters.selectedDepartment, peopleContextOperations],
  );

  const operationContextOperations = useMemo(
    () =>
      filterOperations(operations, {
        ...filters,
        selectedOperation: "",
      }),
    [operations, filters],
  );

  const filterOperationsList = useMemo(
    () => uniqueSorted(operationContextOperations.map((operation) => operation.operation)),
    [operationContextOperations],
  );

  const visibleDepartments = useMemo(() => {
    const query = filters.selectedDepartment.trim().toLocaleLowerCase("ru");
    if (!query) return departments;
    return departments.filter((department) => department.toLocaleLowerCase("ru").includes(query));
  }, [departments, filters.selectedDepartment]);

  const visibleMasters = useMemo(() => {
    const query = filters.selectedMaster.trim().toLocaleLowerCase("ru");
    if (!query) return masters;
    return masters.filter((master) => master.toLocaleLowerCase("ru").includes(query));
  }, [filters.selectedMaster, masters]);

  const visibleOperations = useMemo(() => {
    const query = filters.selectedOperation.trim().toLocaleLowerCase("ru");
    if (!query) return filterOperationsList;
    return filterOperationsList.filter((operation) => operation.toLocaleLowerCase("ru").includes(query));
  }, [filters.selectedOperation, filterOperationsList]);

  function update(next: Partial<DashboardFilters>) {
    onChange({ ...filters, ...next });
  }

  function changeOrder(value: string, commit = false) {
    const next: Partial<DashboardFilters> = { selectedOrder: value, selectedKit: "" };
    if (!value || commit || orders.includes(value)) {
      const nextFilters = applyOrderSelection(filters, operations, value);
      onChange(nextFilters);
      return;
    }
    update(next);
  }

  function changeDepartment(value: string) {
    onChange(applyDepartmentSelection(filters, operations, value));
  }

  function changeMaster(value: string) {
    onChange(applyMasterSelection(filters, operations, value));
  }

  return (
    <FilterPanel onReset={onReset}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-raport-muted">Цель</p>
          <label className="grid gap-1">
            <span className="text-xs text-raport-muted">Целевая доля по технологии</span>
            <TargetControl value={filters.targetPercent} onChange={(targetPercent) => update({ targetPercent })} />
          </label>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-raport-muted">Область данных</p>
          {showOrderFilters ? (
            <>
              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Заказ</span>
                <AutocompleteField
                  value={filters.selectedOrder}
                  placeholder="Все заказы"
                  options={visibleOrders}
                  ariaLabel="Номер заказа"
                  onChange={(value) => changeOrder(value)}
                  onCommit={(value) => changeOrder(value, true)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Комплект</span>
                <Select
                  aria-label="Комплект"
                  value={filters.selectedKit}
                  disabled={!filters.selectedOrder}
                  onChange={(event) => update({ selectedKit: event.currentTarget.value })}
                >
                  <option value="">{filters.selectedOrder ? "Все комплекты" : "Сначала выберите заказ"}</option>
                  {kits.map((kit) => (
                    <option key={kit} value={kit}>
                      {kit}
                    </option>
                  ))}
                </Select>
              </label>
            </>
          ) : null}

          <label className="grid gap-1">
            <span className="text-xs text-raport-muted">Операция</span>
            <AutocompleteField
              value={filters.selectedOperation}
              placeholder="Все операции"
              options={visibleOperations}
              ariaLabel="Операция"
              onChange={(value) => update({ selectedOperation: value })}
            />
          </label>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-raport-muted">Ответственные</p>
          <label className="grid gap-1">
            <span className="text-xs text-raport-muted">Цех</span>
            <AutocompleteField
              value={filters.selectedDepartment}
              placeholder={filters.selectedMaster ? "Все цеха мастера" : "Все цеха"}
              options={visibleDepartments}
              ariaLabel="Цех"
              onChange={changeDepartment}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-raport-muted">Мастер</span>
            <AutocompleteField
              value={filters.selectedMaster}
              placeholder={filters.selectedDepartment ? "Все мастера цеха" : "Все мастера"}
              options={visibleMasters}
              ariaLabel="Мастер"
              onChange={changeMaster}
            />
          </label>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-raport-muted">Период</p>
          <label className="grid gap-1">
            <span className="text-xs text-raport-muted">Дата с</span>
            <Input
              type="date"
              aria-label="Дата с"
              value={filters.selectedDateFrom}
              min={bounds.min}
              max={bounds.max}
              onChange={(event) => update({ selectedDateFrom: clampDateInput(event.currentTarget.value, bounds.min, bounds.max) })}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-raport-muted">Дата по</span>
            <Input
              type="date"
              aria-label="Дата по"
              value={filters.selectedDateTo}
              min={bounds.min}
              max={bounds.max}
              onChange={(event) => update({ selectedDateTo: clampDateInput(event.currentTarget.value, bounds.min, bounds.max) })}
            />
          </label>
        </div>
      </div>
    </FilterPanel>
  );
}

type ActiveFilterChip = {
  label: string;
  tone?: "default" | "secondary";
  onRemove?: () => void;
};
function clampDateInput(value: string, min: string, max: string): string {
  if (!value) return value;
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

function activeFilterChips(
  filters: DashboardFilters,
  defaultFilters: DashboardFilters,
  update: (next: Partial<DashboardFilters>) => void,
): ActiveFilterChip[] {
  const periodLabel =
    filters.selectedDateFrom && filters.selectedDateTo
      ? `Период: ${formatDateChip(filters.selectedDateFrom)} - ${formatDateChip(filters.selectedDateTo)}`
      : filters.selectedDateFrom
        ? `Период: с ${formatDateChip(filters.selectedDateFrom)}`
        : filters.selectedDateTo
          ? `Период: по ${formatDateChip(filters.selectedDateTo)}`
          : "";
  const periodChanged =
    filters.selectedDateFrom !== defaultFilters.selectedDateFrom || filters.selectedDateTo !== defaultFilters.selectedDateTo;

  const selectedItems = [
    filters.selectedOrder ? { label: `Заказ: ${filters.selectedOrder}`, onRemove: () => update({ selectedOrder: "", selectedKit: "" }) } : null,
    filters.selectedKit ? { label: `Комплект: ${filters.selectedKit}`, onRemove: () => update({ selectedKit: "" }) } : null,
    filters.selectedDepartment ? { label: `Цех: ${filters.selectedDepartment}`, onRemove: () => update({ selectedDepartment: "" }) } : null,
    filters.selectedMaster ? { label: `Мастер: ${filters.selectedMaster}`, onRemove: () => update({ selectedMaster: "" }) } : null,
    filters.selectedOperation ? { label: `Операция: ${filters.selectedOperation}`, onRemove: () => update({ selectedOperation: "" }) } : null,
    periodLabel
      ? {
          label: periodLabel,
          ...(periodChanged
            ? {
                onRemove: () =>
                  update({
                    selectedDateFrom: defaultFilters.selectedDateFrom,
                    selectedDateTo: defaultFilters.selectedDateTo,
                  }),
              }
            : {}),
        }
      : null,
  ].filter((item): item is ActiveFilterChip => Boolean(item));

  const targetChip: ActiveFilterChip = {
    label: `Цель: ${filters.targetPercent}%`,
    ...(filters.targetPercent !== defaultFilters.targetPercent
      ? { onRemove: () => update({ targetPercent: defaultFilters.targetPercent }) }
      : {}),
  };

  if (selectedItems.length === 0) {
    return [
      { label: "все данные", tone: "secondary" },
      targetChip,
    ];
  }

  return [targetChip, ...selectedItems];
}


function insightStatus(ratio: number | null, targetRatio: number) {
  if (ratio === null) {
    return {
      label: "Нет расчета",
      className: "border-raport-border bg-raport-surface-soft text-raport-muted",
    };
  }

  const tone = targetTone(ratio, targetRatio);
  if (tone === "high") {
    return {
      label: "Цель достигнута",
      className: "border-raport-success-border bg-raport-success-muted text-raport-success",
    };
  }

  if (tone === "medium") {
    return {
      label: "Ниже цели",
      className: "border-raport-warning-border bg-raport-warning-muted text-raport-warning",
    };
  }

  return {
    label: "Критично ниже цели",
    className: "border-raport-danger-border bg-raport-danger-muted text-raport-danger",
  };
}

function formatPercentageGap(value: number): string {
  return `${(value * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} п.п.`;
}

function topAttentionRow(rows: ContributionRow[], targetRatio: number): ContributionRow | undefined {
  return leaderboardRows(
    rows.filter((row) => (row.ownTechnologyRatio ?? 0) < targetRatio && row.noTechnologyTime > 0),
    "attention",
  )[0];
}

function sszInsightPoints({
  targetRatio,
  orderRows,
  departmentRows,
  operationRows,
}: {
  targetRatio: number;
  orderRows: ContributionRow[];
  departmentRows: ContributionRow[];
  operationRows: ContributionRow[];
}): string[] {
  const points: string[] = [];

  const attentionOrder = topAttentionRow(orderRows, targetRatio);
  if (attentionOrder) {
    points.push(
      `Заказ: ${attentionOrder.key} — ${formatHours(attentionOrder.noTechnologyTime)} н-ч без технологии, доля ${formatPercent(attentionOrder.ownNoTechnologyRatio)}.`,
    );
  } else {
    points.push("Заказы: критичных отклонений от цели не видно.");
  }

  const attentionDepartment = topAttentionRow(departmentRows, targetRatio);
  if (attentionDepartment) {
    points.push(
      `Цех: ${attentionDepartment.key} — ${formatHours(attentionDepartment.noTechnologyTime)} н-ч без технологии, доля ${formatPercent(attentionDepartment.ownNoTechnologyRatio)}.`,
    );
  } else {
    points.push("Цеха: критичных отклонений от цели не видно.");
  }

  const attentionOperation = topAttentionRow(operationRows, targetRatio);
  if (attentionOperation) {
    points.push(
      `Операция: ${attentionOperation.key} — ${formatHours(attentionOperation.noTechnologyTime)} н-ч без технологии, доля ${formatPercent(attentionOperation.ownNoTechnologyRatio)}.`,
    );
  } else {
    points.push("Операции: критичных отклонений от цели не видно.");
  }

  return points.slice(0, 3);
}

function currentSelectionPeriodLabel(filters: DashboardFilters, report: ImportedReport): string {
  if (filters.selectedDateFrom && filters.selectedDateTo) {
    return `${formatDateChip(filters.selectedDateFrom)} - ${formatDateChip(filters.selectedDateTo)}`;
  }
  if (filters.selectedDateFrom) return `с ${formatDateChip(filters.selectedDateFrom)}`;
  if (filters.selectedDateTo) return `по ${formatDateChip(filters.selectedDateTo)}`;
  return formatReportPeriod(report.period);
}

function currentA3FilterSummary(filters: DashboardFilters): string {
  const parts = [
    filters.selectedOrder ? `заказ ${filters.selectedOrder}` : null,
    filters.selectedKit ? `комплект ${filters.selectedKit}` : null,
    filters.selectedDepartment ? `цех ${filters.selectedDepartment}` : null,
    filters.selectedMaster ? `мастер ${filters.selectedMaster}` : null,
    filters.selectedOperation ? `операция ${filters.selectedOperation}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "все данные отчета";
}



function SszDashboard({ report, initialViewMode, onViewModeChange }: { report: ImportedReport; initialViewMode: SszViewMode; onViewModeChange: (mode: SszViewMode) => void }) {
  const defaultFilters = useMemo(() => initialFilters(report.period), [report.period]);
  const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters(report.period));
  const [viewMode, setViewMode] = useState<SszViewMode>(initialViewMode);
  const [a3Draft, setA3Draft] = useState<LocalA3DraftInput | null>(null);
  const [a3Protocols, setA3Protocols] = useState<LocalA3Protocol[]>([]);
  const historyComparisonStart = monthStartDateKey(filters.selectedDateFrom || report.period.start || "") || undefined;
  const { history, previousSnapshot } = useSSZHistory(historyComparisonStart);
  const kpiPreviousSnapshot = isMonthlyCoverageReady(filters.selectedDateFrom, filters.selectedDateTo) ? previousSnapshot : null;
  const targetRatio = filters.targetPercent / 100;
  const hasTrendData = history.filter((snapshot) => snapshot.grain === "month" && snapshot.coverage?.isTrendReady === true && typeof snapshot.metrics.workTechnologyPercent === "number" && Number.isFinite(snapshot.metrics.workTechnologyPercent)).length >= 2;
  const relatedA3Summary = useMemo(
    () => summarizeSszRelatedTechnologyA3(
      a3Protocols,
      filters.selectedDateFrom || report.period.start || undefined,
      filters.selectedDateTo || report.period.end || undefined,
    ),
    [a3Protocols, filters.selectedDateFrom, filters.selectedDateTo, report.period.end, report.period.start],
  );
  const activeRelatedA3Count = relatedA3Summary.open + relatedA3Summary.in_progress + relatedA3Summary.waiting_review;
  const relatedA3BadgeLabel =
    relatedA3Summary.total > 0
      ? `${relatedA3Summary.total} разборов${activeRelatedA3Count > 0 ? ` · активных ${activeRelatedA3Count}` : ""}`
      : "разборов нет";

  async function refreshA3Protocols() {
    try {
      setA3Protocols(await localA3Repository.listProtocols());
    } catch {
      setA3Protocols([]);
    }
  }

  useEffect(() => {
    void refreshA3Protocols();
  }, []);

  const operations = useMemo(() => operationScope(report.sszRecords), [report.sszRecords]);
  const filteredRecords = useMemo(() => filterRecords(report.sszRecords, filters), [report.sszRecords, filters]);
  const filteredOperations = useMemo(() => operationScope(filteredRecords), [filteredRecords]);

  const departmentRows = useMemo(() => groupContributions(filteredOperations, "department"), [filteredOperations]);
  const orderRows = useMemo(() => groupContributions(filteredOperations, "order"), [filteredOperations]);
  const masterRows = useMemo(() => groupContributions(filteredOperations, "master"), [filteredOperations]);
  const operationRows = useMemo(() => groupContributions(filteredOperations, "operation"), [filteredOperations]);
  const kpis = useMemo(() => kpiData(filteredRecords, filteredOperations), [filteredRecords, filteredOperations]);
  const mainInsightStatus = insightStatus(kpis.workTechnologyRatio, targetRatio);
  const mainInsightGap =
    kpis.workTechnologyRatio === null
      ? "отклонение: н/д"
      : kpis.workTechnologyRatio >= targetRatio
        ? `выше цели на ${formatPercentageGap(kpis.workTechnologyRatio - targetRatio)}`
        : `отклонение: ${formatPercentageGap(targetRatio - kpis.workTechnologyRatio)}`;
  const mainInsightPoints = useMemo(
    () =>
      sszInsightPoints({
        targetRatio,
        orderRows,
        departmentRows,
        operationRows,
      }),
    [targetRatio, orderRows, departmentRows, operationRows],
  );
  const mainInsightAttentionRows = useMemo(
    () => ({
      order: topAttentionRow(orderRows, targetRatio),
      department: topAttentionRow(departmentRows, targetRatio),
      operation: topAttentionRow(operationRows, targetRatio),
    }),
    [targetRatio, orderRows, departmentRows, operationRows],
  );
  const canCreateA3 = viewMode === "analyst" && kpis.workTechnologyRatio !== null && kpis.workTechnologyRatio < targetRatio;

  function createTechnologyA3Deviation() {
    return mapSszTechnologyDeviationToA3Deviation({
      periodLabel: currentSelectionPeriodLabel(filters, report),
      periodStart: filters.selectedDateFrom || report.period.start,
      periodEnd: filters.selectedDateTo || report.period.end,
      workTechnologyRatio: kpis.workTechnologyRatio,
      targetPercent: filters.targetPercent,
      deviationScale: mainInsightGap,
      filterSummary: currentA3FilterSummary(filters),
      attentionRows: mainInsightAttentionRows,
    });
  }

  function openTechnologyA3Draft() {
    setA3Draft(createA3DraftFromDeviation(createTechnologyA3Deviation()));
  }

  function selectOrder(order: string) {
    setFilters((current) => applyOrderSelection(current, operations, order));
  }

  function selectDepartment(department: string) {
    setFilters((current) => applyDepartmentSelection(current, operations, department));
  }

  function selectMaster(master: string) {
    setFilters((current) => applyMasterSelection(current, operations, master));
  }

  function selectOperation(operation: string) {
    patchFilters({ selectedOperation: operation });
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  function patchFilters(next: Partial<DashboardFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function changeViewMode(nextMode: SszViewMode) {
    setViewMode(nextMode);
    onViewModeChange(nextMode);
    saveStoredSszViewMode(nextMode);
    if (nextMode === "manager") {
      setA3Draft(null);
      setFilters((current) =>
        current.selectedOrder || current.selectedKit ? { ...current, selectedOrder: "", selectedKit: "" } : current,
      );
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-3 lg:self-start">
        <SszFilterSidebar
          operations={operations}
          filters={filters}
          viewMode={viewMode}
          onChange={setFilters}
          onReset={resetFilters}
        />
      </div>

      <div className="grid gap-4 relative">
        <FilterStatusBar
          chips={activeFilterChips(filters, defaultFilters, patchFilters)}
          actions={
            <DashboardSwitch
              value={viewMode}
              onChange={(value) => changeViewMode(value as SszViewMode)}
              options={[
                { value: "manager", label: "Руководитель" },
                { value: "analyst", label: "Аналитик" },
              ]}
            />
          }
        />

        <motion.div layout="position">
          <SszKpiCards data={kpis} targetPercent={filters.targetPercent} previousSnapshot={kpiPreviousSnapshot} />
        </motion.div>

        <motion.div layout="position">
          <SectionCard
            title="Главный вывод"
            description="Оценка выполнения заданий и ключевые отклонения."
            Icon={FileSpreadsheet}
            actions={
              canCreateA3 ? (
                <A3ReviewButton deviation={createTechnologyA3Deviation} onCreateDraft={setA3Draft} />
              ) : undefined
            }
          >
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className={`rounded-control border px-4 py-3 ${mainInsightStatus.className}`}>
              <span className="block text-xs font-extrabold uppercase tracking-[0.12em]">{mainInsightStatus.label}</span>
              <strong className="mt-2 block text-3xl font-extrabold tabular-nums">{formatPercent(kpis.workTechnologyRatio)}</strong>
              <span className="text-xs font-semibold">цель: {filters.targetPercent}%</span>
              <span className="mt-1 block text-xs font-semibold">{mainInsightGap}</span>
            </div>
            <div className="grid gap-2 rounded-control border border-raport-border bg-raport-surface px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-raport-muted">Где теряется технология</p>
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
          {viewMode === "analyst" && a3Draft ? (
            <motion.div
              key="ssz-a3-editor"
              layout="position"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <A3DashboardDraftPanel
                draft={a3Draft}
                onRefreshDraft={openTechnologyA3Draft}
                onClose={() => setA3Draft(null)}
                onSaved={() => {
                  void refreshA3Protocols();
                }}
                extraActions={
                  <span
                    className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${
                      activeRelatedA3Count > 0
                        ? "border-raport-border bg-raport-surface text-raport-text"
                        : "border-raport-border bg-raport-surface-soft text-raport-muted"
                    }`}
                  >
                    {relatedA3BadgeLabel}
                  </span>
                }
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {viewMode === "analyst" && hasTrendData ? (
            <motion.div
              key="analyst-trend-chart"
              layout="position"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <SSZTrendChart data={history} targetPercent={filters.targetPercent} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {viewMode === "analyst" ? (
            <motion.div
              key="analyst-leaderboards"
              layout="position"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="w-full grid gap-4 xl:grid-cols-2"
            >
              <MasterLeaderboardCard
                title="Лидеры по технологии"
                description="Мастера, достигшие целевой доли по технологии."
                rows={masterRows}
                tone="support"
                targetRatio={targetRatio}
                onMasterClick={selectMaster}
              />
              <MasterLeaderboardCard
                title="Ниже цели"
                description="Мастера с наибольшим объемом работ без технологии."
                rows={masterRows}
                tone="growth"
                targetRatio={targetRatio}
                onMasterClick={selectMaster}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div layout="position">
          <SectionCard
            title="Срезы по технологии"
            description={
              viewMode === "manager"
                ? "Доля работ по технологии по цехам, мастерам и операциям."
                : "Доля работ по технологии по заказам, цехам, мастерам и операциям."
            }
            Icon={Gauge}
          >
          <div className="grid gap-4 relative">
            <AnimatePresence mode="popLayout" initial={false}>
              {viewMode === "analyst" ? (
                <motion.div
                  key="analyst-tech-board-orders"
                  layout="position"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <TechnologyBoardCard
                    title="Заказы"
                    subtitle="Ранжирование по общему объему нормо-часов."
                    Icon={FileSpreadsheet}
                    rows={orderRows}
                    targetRatio={targetRatio}
                    onRowClick={selectOrder}
                    layout="compact-list"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              <TechnologyBoardCard
                title="Цеха"
                subtitle="Ранжирование по общему объему нормо-часов."
                Icon={Factory}
                rows={departmentRows}
                targetRatio={targetRatio}
                onRowClick={selectDepartment}
                layout="compact-list"
              />
              <TechnologyBoardCard
                title={filters.selectedDepartment ? "Мастера цеха" : "Мастера"}
                subtitle={
                  filters.selectedDepartment
                    ? `Мастера выбранного цеха: ${filters.selectedDepartment}`
                    : "Рейтинг мастеров в текущей выборке."
                }
                Icon={Users}
                rows={masterRows}
                targetRatio={targetRatio}
                onRowClick={selectMaster}
                layout="compact-list"
              />
              <TechnologyBoardCard
                title={filters.selectedDepartment ? "Операции цеха" : "Операции"}
                subtitle={
                  filters.selectedDepartment
                    ? `Операции выбранного цеха: ${filters.selectedDepartment}`
                    : "Операции с учетом текущих фильтров."
                }
                Icon={Wrench}
                rows={operationRows}
                targetRatio={targetRatio}
                onRowClick={selectOperation}
                layout="compact-list"
              />
            </div>
          </div>
        </SectionCard>
        </motion.div>
      </div>
    </div>
  );
}

export function SszDashboardPage() {
  const navigate = useNavigate();
  const [report] = useState<ImportedReport | null>(() => readPendingDashboardData<ImportedReport>("/ssz"));
  const [headerViewMode, setHeaderViewMode] = useState<SszViewMode>(() => readStoredSszViewMode());

  useEffect(() => {
    if (!report) {
      navigate("/", {
        replace: true,
        state: {
          statusNotice: "Данные ССЗ не найдены",
        },
      });
    }
  }, [navigate, report]);

  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <DashboardHeaderMark Icon={FileSpreadsheet} />
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-raport-text md:text-3xl">Рапорт</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Качество оформления ССЗ: анализ доли работ по технологии, заказов, цехов, мастеров и операций на данных из файла."
        actions={(themeToggle) => (
          <div className="grid w-full min-w-0 max-w-[430px] justify-items-end gap-2 sm:min-w-[320px]">
            <div className="flex w-full items-center justify-end gap-2">
              <HeaderIconButton to="/" title="Заменить отчет">
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
              </HeaderIconButton>
              {headerViewMode === "analyst" ? (
                <HeaderIconButton to="/a3?dashboard=ssz" title="Открыть журнал A3-разборов">
                  <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
                </HeaderIconButton>
              ) : null}
              <HelpLink />
              {themeToggle}
            </div>
            {report ? (
              <div className="w-full min-w-0 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs text-raport-muted">
                <p className="mb-1 truncate font-semibold text-raport-text" title={report.sourceName}>
                  {report.sourceName}
                </p>
                <p className="truncate">{formatReportPeriod(report.period)} · загружен {formatImportedAt(report.importedAt)}</p>
                {report.warnings.length > 0 ? (
                  <p className="mt-1 text-raport-warning">
                    Предупреждений: {report.warnings.length.toLocaleString("ru-RU")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      />

      {report ? (
        <div className="mt-4 grid gap-4">
          <SszDashboard report={report} initialViewMode={headerViewMode} onViewModeChange={setHeaderViewMode} />
        </div>
      ) : null}
    </PageShell>
  );
}
