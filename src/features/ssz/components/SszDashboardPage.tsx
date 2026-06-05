import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Factory, FileSpreadsheet, Gauge, Users, Wrench } from "lucide-react";

import {
  DashboardHeader,
  DashboardSwitch,
  FilterPanel,
  FilterStatusBar,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
import { isMonthlyCoverageReady, monthStartDateKey } from "../../../shared/lib/periodCoverage";
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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--raport-muted)]">Цель</p>
          <label className="grid gap-1">
            <span className="text-xs text-[var(--raport-muted)]">Целевая доля по технологии</span>
            <TargetControl value={filters.targetPercent} onChange={(targetPercent) => update({ targetPercent })} />
          </label>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--raport-muted)]">Область данных</p>
          {showOrderFilters ? (
            <>
              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Заказ</span>
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
                <span className="text-xs text-[var(--raport-muted)]">Комплект</span>
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
            <span className="text-xs text-[var(--raport-muted)]">Операция</span>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--raport-muted)]">Ответственные</p>
          <label className="grid gap-1">
            <span className="text-xs text-[var(--raport-muted)]">Цех</span>
            <AutocompleteField
              value={filters.selectedDepartment}
              placeholder={filters.selectedMaster ? "Все цеха мастера" : "Все цеха"}
              options={visibleDepartments}
              ariaLabel="Цех"
              onChange={changeDepartment}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-[var(--raport-muted)]">Мастер</span>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--raport-muted)]">Период</p>
          <label className="grid gap-1">
            <span className="text-xs text-[var(--raport-muted)]">Дата с</span>
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
            <span className="text-xs text-[var(--raport-muted)]">Дата по</span>
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
      className: "border-slate-300 bg-slate-50 text-slate-700",
    };
  }

  const tone = targetTone(ratio, targetRatio);
  if (tone === "high") {
    return {
      label: "Норма",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (tone === "medium") {
    return {
      label: "Контроль",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Критично",
    className: "border-red-200 bg-red-50 text-red-700",
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



function SszDashboard({ report }: { report: ImportedReport }) {
  const defaultFilters = useMemo(() => initialFilters(report.period), [report.period]);
  const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters(report.period));
  const [viewMode, setViewMode] = useState<SszViewMode>(() => readStoredSszViewMode());
  const historyComparisonStart = monthStartDateKey(filters.selectedDateFrom || report.period.start || "") || undefined;
  const { history, previousSnapshot } = useSSZHistory(historyComparisonStart);
  const kpiPreviousSnapshot = isMonthlyCoverageReady(filters.selectedDateFrom, filters.selectedDateTo) ? previousSnapshot : null;
  const targetRatio = filters.targetPercent / 100;

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
    saveStoredSszViewMode(nextMode);
    if (nextMode === "manager") {
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

      <div className="grid gap-4">
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

        <SszKpiCards data={kpis} targetPercent={filters.targetPercent} previousSnapshot={kpiPreviousSnapshot} />

        {viewMode === "analyst" ? <SSZTrendChart data={history} targetPercent={filters.targetPercent} /> : null}

        <SectionCard title="Главный вывод" description="Короткая управленческая интерпретация текущей выборки." Icon={FileSpreadsheet}>
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className={`rounded-[var(--raport-radius-control)] border px-4 py-3 ${mainInsightStatus.className}`}>
              <span className="block text-xs font-extrabold uppercase tracking-[0.12em]">{mainInsightStatus.label}</span>
              <strong className="mt-2 block text-3xl font-extrabold tabular-nums">{formatPercent(kpis.workTechnologyRatio)}</strong>
              <span className="text-xs font-semibold">цель: {filters.targetPercent}%</span>
              <span className="mt-1 block text-xs font-semibold">{mainInsightGap}</span>
            </div>
            <div className="grid gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--raport-muted)]">Где теряется технология</p>
              {mainInsightPoints.map((point) => (
                <div key={point} className="flex gap-2 text-sm font-semibold leading-relaxed text-[var(--raport-text)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--raport-primary)]" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {viewMode === "analyst" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <MasterLeaderboardCard
              title="Лидеры по технологии"
              description="Мастера, достигшие целевой доли по технологии."
              rows={masterRows}
              tone="support"
              targetRatio={targetRatio}
              onMasterClick={selectMaster}
            />
            <MasterLeaderboardCard
              title="Зона внимания"
              description="Мастера с наибольшим объемом работ без технологии."
              rows={masterRows}
              tone="growth"
              targetRatio={targetRatio}
              onMasterClick={selectMaster}
            />
          </div>
        ) : null}

        <SectionCard
          title="Срезы по технологии"
          description={
            viewMode === "manager"
              ? "Доля работ по технологии по цехам, мастерам и операциям."
              : "Доля работ по технологии по заказам, цехам, мастерам и операциям."
          }
          Icon={Gauge}
        >
          <div className="grid gap-4">
            {viewMode === "analyst" ? (
              <TechnologyBoardCard
                title="Заказы"
                subtitle="Ранжирование по общему объему нормо-часов."
                Icon={FileSpreadsheet}
                rows={orderRows}
                targetRatio={targetRatio}
                onRowClick={selectOrder}
                layout="compact-list"
              />
            ) : null}

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
      </div>
    </div>
  );
}

export function SszDashboardPage() {
  const navigate = useNavigate();
  const [report] = useState<ImportedReport | null>(() => readPendingDashboardData<ImportedReport>("/ssz"));

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
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FileSpreadsheet className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-slate-900 md:text-3xl">Рапорт</span>
              <span className="mt-1 block text-sm font-bold text-[var(--raport-primary)]">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Качество оформления ССЗ: анализ доли работ по технологии, заказов, цехов, мастеров и операций на данных из файла."
        actions={
          <div className="flex w-full max-w-[420px] flex-col items-end gap-2">
            <Link
              to="/"
              className="inline-flex min-h-8 items-center rounded-[var(--raport-radius-control)] border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--raport-primary)] hover:bg-[var(--raport-action-bg-active)]"
            >
              Заменить отчет
            </Link>
            {report ? (
              <div className="w-full rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-xs text-[var(--raport-muted)]">
                <p className="mb-1 truncate font-semibold text-[var(--raport-text)]" title={report.sourceName}>
                  {report.sourceName}
                </p>
                <p>Период: {formatReportPeriod(report.period)}</p>
                <p>Загружен: {formatImportedAt(report.importedAt)}</p>
                {report.warnings.length > 0 ? (
                  <p className="mt-1 text-amber-700">
                    Предупреждений: {report.warnings.length.toLocaleString("ru-RU")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />

      {report ? (
        <div className="mt-4 grid gap-4">
          <SszDashboard report={report} />
        </div>
      ) : null}
    </PageShell>
  );
}
