import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Factory,
  Gauge,
  type LucideIcon,
  Users,
  Wrench,
} from "lucide-react";
import {
  DashboardHeader,
  DashboardSwitch,
  DataTable,
  FilterPanel,
  FilterStatusBar,
  MetricCard,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
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
  type KpiCardData,
  uniqueSorted,
} from "../logic/dashboard";
import { formatHours, formatPercent } from "../logic/format";

type TechnologyStatusFilter = "all" | "met" | "below";

const targetMarkerClassByStep: Record<number, string> = {
  0: "left-0",
  5: "left-[5%]",
  10: "left-[10%]",
  15: "left-[15%]",
  20: "left-[20%]",
  25: "left-[25%]",
  30: "left-[30%]",
  35: "left-[35%]",
  40: "left-[40%]",
  45: "left-[45%]",
  50: "left-1/2",
  55: "left-[55%]",
  60: "left-[60%]",
  65: "left-[65%]",
  70: "left-[70%]",
  75: "left-3/4",
  80: "left-[80%]",
  85: "left-[85%]",
  90: "left-[90%]",
  95: "left-[95%]",
  100: "left-full",
};

function targetTone(value: number | null, targetRatio: number): "low" | "medium" | "high" {
  const ratioValue = value ?? 0;
  if (ratioValue >= targetRatio) return "high";
  if (targetRatio - ratioValue <= 0.1) return "medium";
  return "low";
}

function statusLabel(row: ContributionRow, targetRatio: number): "Цель достигнута" | "Ниже цели" {
  return (row.ownTechnologyRatio ?? 0) >= targetRatio ? "Цель достигнута" : "Ниже цели";
}

function filterByTechnologyStatus(
  rows: ContributionRow[],
  filter: TechnologyStatusFilter,
  targetRatio: number,
): ContributionRow[] {
  if (filter === "met") return rows.filter((row) => (row.ownTechnologyRatio ?? 0) >= targetRatio);
  if (filter === "below") return rows.filter((row) => (row.ownTechnologyRatio ?? 0) < targetRatio);
  return rows;
}

function leaderboardRows(rows: ContributionRow[], mode: "leaders" | "attention"): ContributionRow[] {
  return [...rows].sort((left, right) => {
    const leftRatio = left.ownTechnologyRatio ?? 0;
    const rightRatio = right.ownTechnologyRatio ?? 0;
    if (mode === "leaders") {
      return right.technologyTime - left.technologyTime || right.technologyOperationCount - left.technologyOperationCount || rightRatio - leftRatio;
    }

    return (
      right.noTechnologyTime - left.noTechnologyTime ||
      right.noTechnologyOperationCount - left.noTechnologyOperationCount ||
      leftRatio - rightRatio
    );
  });
}

function growthSeverity(value: number | null): "critical" | "risk" | "soft" {
  const ratioValue = value ?? 0;
  if (ratioValue >= 0.8) return "critical";
  if (ratioValue >= 0.5) return "risk";
  return "soft";
}

function ProgressStrip({
  value,
  targetRatio,
  mode,
  showTargetMarker = false,
  spacingClassName = "mt-1.5",
}: {
  value: number | null;
  targetRatio?: number;
  mode: "technology" | "attention";
  showTargetMarker?: boolean;
  spacingClassName?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round((value ?? 0) * 1000) / 10));
  const markerRatio = mode === "attention" ? 1 - (targetRatio ?? 0.7) : (targetRatio ?? 0.7);
  const safeTarget = Math.max(0, Math.min(100, Math.round(markerRatio * 100)));
  const targetStep = Math.round(safeTarget / 5) * 5;
  const tone =
    mode === "technology"
      ? targetTone(value, targetRatio ?? 0.7)
      : growthSeverity(value) === "critical"
        ? "low"
        : "medium";

  const barClass =
    tone === "high"
      ? "[&::-moz-progress-bar]:bg-[var(--raport-success)] [&::-webkit-progress-value]:bg-[var(--raport-success)]"
      : tone === "medium"
        ? "[&::-moz-progress-bar]:bg-[var(--raport-warning)] [&::-webkit-progress-value]:bg-[var(--raport-warning)]"
        : "[&::-moz-progress-bar]:bg-[var(--raport-danger)] [&::-webkit-progress-value]:bg-[var(--raport-danger)]";

  return (
    <div className={spacingClassName}>
      <div className="relative">
        <progress
          max={100}
          value={safeValue}
          className={`h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 ${barClass}`}
        />
        {showTargetMarker ? (
          <span
            className={`absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-500/70 ${targetMarkerClassByStep[targetStep] ?? "left-[70%]"}`}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

function RowNameButton({ text, onClick, className }: { text: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={text}
      className={`block min-w-0 max-w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent px-0 py-0 text-left text-[var(--raport-text)] hover:text-[var(--raport-primary)] ${className ?? ""}`}
    >
      {text}
    </button>
  );
}

function RankBadge({ rank, tone }: { rank: number; tone: "support" | "danger" | "warning" }) {
  const toneClass =
    tone === "support"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex min-h-4 min-w-8 items-center justify-center rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-4 ${toneClass}`}
      aria-label={`Рейтинг ${rank}`}
    >
      #{rank}
    </span>
  );
}

function AutocompleteField({
  value,
  onChange,
  placeholder,
  options,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  onCommit?: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setOpen(true);
        }}
      />
      {open && options.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white shadow-[var(--raport-shadow-card)]">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-[var(--raport-text)] hover:bg-[var(--raport-action-bg)]"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                onCommit?.(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TargetControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  function applyValue(nextValue: number) {
    onChange(Math.max(0, Math.min(100, Math.round(nextValue))));
  }

  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        className="min-h-10 !w-14 px-1 text-center text-base font-semibold"
        aria-label="Целевая доля по технологии в процентах"
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        className="h-2 w-full min-w-0 cursor-pointer accent-[var(--raport-primary)]"
        aria-label="Целевая доля по технологии"
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
    </div>
  );
}

function SszFilterSidebar({
  operations,
  filters,
  onChange,
  onReset,
}: {
  operations: OperationRecord[];
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  onReset: () => void;
}) {
  const bounds = useMemo(() => dateBounds(operations), [operations]);

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
              onChange={(event) => update({ selectedDateFrom: event.currentTarget.value })}
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
              onChange={(event) => update({ selectedDateTo: event.currentTarget.value })}
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

function SszKpiCards({ data, targetPercent }: { data: KpiCardData; targetPercent: number }) {
  const workTone = targetTone(data.workTechnologyRatio, targetPercent / 100);
  const operationTone = targetTone(data.operationTechnologyRatio, targetPercent / 100);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        label="Всего ССЗ"
        value={data.sszCount.toLocaleString("ru-RU")}
        note="в анализируемом периоде"
        Icon={ClipboardList}
        tone="neutral"
      />
      <MetricCard
        label="Доля работ по технологии"
        value={formatPercent(data.workTechnologyRatio)}
        note="по нормо-часам"
        Icon={Factory}
        tone={workTone === "high" ? "success" : workTone === "medium" ? "warning" : "danger"}
      />
      <MetricCard
        label="Доля операций по технологии"
        value={formatPercent(data.operationTechnologyRatio)}
        note="по количеству операций"
        Icon={Gauge}
        tone={operationTone === "high" ? "success" : operationTone === "medium" ? "warning" : "danger"}
      />
    </div>
  );
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

function MasterLeaderboardCard({
  title,
  description,
  rows,
  tone,
  targetRatio,
  onMasterClick,
}: {
  title: string;
  description: string;
  rows: ContributionRow[];
  tone: "support" | "growth";
  targetRatio: number;
  onMasterClick: (master: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const scopedRows = useMemo(
    () =>
      rows.filter((row) => {
        const technologyRatio = row.ownTechnologyRatio ?? 0;
        return tone === "support"
          ? technologyRatio >= targetRatio
          : technologyRatio < targetRatio && (row.noTechnologyTime > 0 || row.noTechnologyOperationCount > 0);
      }),
    [rows, targetRatio, tone],
  );

  const ordered = useMemo(
    () => leaderboardRows(scopedRows, tone === "support" ? "leaders" : "attention"),
    [scopedRows, tone],
  );

  const visibleRows = showAll ? ordered : ordered.slice(0, 5);

  return (
    <SectionCard
      title={title}
      description={description}
      Icon={tone === "support" ? CheckCircle2 : AlertTriangle}
      pinActionsRight
      actions={
        ordered.length > 5 ? (
          <DashboardSwitch
            value={showAll ? "all" : "top"}
            onChange={(value) => setShowAll(value === "all")}
            options={[
              { value: "top", label: "ТОП" },
              { value: "all", label: "Все" },
            ]}
          />
        ) : undefined
      }
    >
      {visibleRows.length === 0 ? (
        <p className="text-sm text-[var(--raport-muted)]">Нет данных для текущей выборки.</p>
      ) : (
        <div className="divide-y divide-[var(--raport-border)] rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3">
          {visibleRows.map((row, index) => {
            const ratio = tone === "support" ? row.ownTechnologyRatio : row.ownNoTechnologyRatio;
            const hours = tone === "support" ? row.technologyTime : row.noTechnologyTime;
            const operationCount = tone === "support" ? row.technologyOperationCount : row.noTechnologyOperationCount;
            const status = tone === "support" ? "Цель достигнута" : "Ниже цели";
            const rankTone =
              tone === "support"
                ? "support"
                : growthSeverity(row.ownNoTechnologyRatio) === "risk"
                  ? "warning"
                  : "danger";

            return (
              <div key={row.key} className="py-1.5">
                <div className="grid gap-1">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_132px] items-center gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="pt-px">
                        <RankBadge rank={index + 1} tone={rankTone} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <RowNameButton
                          text={row.key}
                          onClick={() => onMasterClick(row.key)}
                          className="w-full text-sm font-semibold leading-[14px]"
                        />
                      </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-[44px_88px] items-center gap-1">
                      <span className="text-right text-xs font-semibold leading-[14px] tabular-nums text-[var(--raport-text)]">
                        {formatPercent(ratio)}
                      </span>
                      <Badge
                        className="min-h-4 w-[88px] justify-center overflow-hidden text-ellipsis whitespace-nowrap px-1 py-0 text-[9px] leading-4"
                        variant={status === "Цель достигнута" ? "secondary" : "warning"}
                      >
                        {status}
                      </Badge>
                    </div>
                  </div>
                  <ProgressStrip
                    value={ratio}
                    targetRatio={targetRatio}
                    mode={tone === "support" ? "technology" : "attention"}
                    showTargetMarker
                    spacingClassName="mt-0"
                  />
                  <div className="flex min-h-4 items-center text-[11px] leading-4 tabular-nums text-[var(--raport-muted)]">
                    <span>
                      н-ч всего: {formatHours(row.totalTime)} · {tone === "support" ? "н-ч по тех." : "н-ч без тех."}: {formatHours(hours)} ·{" "}
                      {tone === "support" ? "опер. по тех." : "опер. без тех."}: {operationCount.toLocaleString("ru-RU")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function TechnologyBoardCard({
  title,
  subtitle,
  Icon,
  rows,
  targetRatio,
  onRowClick,
  layout = "table",
}: {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  rows: ContributionRow[];
  targetRatio: number;
  onRowClick?: (value: string) => void;
  layout?: "table" | "compact-list";
}) {
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TechnologyStatusFilter>("all");

  const scopedRows = useMemo(() => filterByTechnologyStatus(rows, statusFilter, targetRatio), [rows, statusFilter, targetRatio]);
  const visibleRows = showAll ? scopedRows : scopedRows.slice(0, 5);

  return (
    <SectionCard
      title={title}
      description={subtitle}
      Icon={Icon}
      pinActionsRight
      headerClassName="pb-1"
      actions={
        scopedRows.length > 5 ? (
          <DashboardSwitch
            value={showAll ? "all" : "top"}
            onChange={(value) => setShowAll(value === "all")}
            options={[
              { value: "top", label: "ТОП" },
              { value: "all", label: "Все" },
            ]}
          />
        ) : undefined
      }
    >
      <div className="mb-2 mt-0 flex justify-center">
        <DashboardSwitch
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as TechnologyStatusFilter)}
          options={[
            { value: "all", label: "Все" },
            { value: "met", label: "Цель достигнута" },
            { value: "below", label: "Ниже цели" },
          ]}
        />
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-[var(--raport-muted)]">Нет данных для текущей выборки.</p>
      ) : (
        layout === "compact-list" ? (
          <div className="divide-y divide-[var(--raport-border)] rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3">
              {visibleRows.map((row) => (
                <div key={row.key} className="py-1.5">
                  <div className="grid gap-1">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_132px] items-center gap-2">
                      <div className="min-w-0">
                        {onRowClick ? (
                          <RowNameButton text={row.key} onClick={() => onRowClick(row.key)} className="w-full text-sm font-semibold leading-[14px]" />
                        ) : (
                          <span className="block truncate text-sm font-semibold leading-[14px]">{row.key}</span>
                        )}
                      </div>
                      <div className="grid shrink-0 grid-cols-[44px_88px] items-center gap-1">
                        <span className="text-right text-xs font-semibold leading-[14px] tabular-nums text-[var(--raport-text)]">
                          {formatPercent(row.ownTechnologyRatio)}
                        </span>
                        <Badge
                          className="min-h-5 w-[88px] justify-center overflow-hidden text-ellipsis whitespace-nowrap px-1 py-0 text-[9px] leading-4"
                          variant={statusLabel(row, targetRatio) === "Цель достигнута" ? "secondary" : "warning"}
                        >
                          {statusLabel(row, targetRatio)}
                        </Badge>
                      </div>
                  </div>
                  <ProgressStrip
                    value={row.ownTechnologyRatio}
                    targetRatio={targetRatio}
                    mode="technology"
                    showTargetMarker
                    spacingClassName="mt-0"
                  />
                    <div className="flex min-h-4 items-center text-[11px] leading-4 tabular-nums text-[var(--raport-muted)]">
                      <span>
                        н-ч всего: {formatHours(row.totalTime)} · н-ч по тех.: {formatHours(row.technologyTime)} · опер. по тех.:{" "}
                        {row.technologyOperationCount.toLocaleString("ru-RU")}
                      </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            rows={visibleRows}
            rowKey={(row) => row.key}
            columns={[
              {
                key: "name",
                header: "Позиция",
                cell: (row) =>
                  onRowClick ? (
                    <div className="min-w-0">
                      <RowNameButton text={row.key} onClick={() => onRowClick(row.key)} />
                      <ProgressStrip value={row.ownTechnologyRatio} targetRatio={targetRatio} mode="technology" />
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <span>{row.key}</span>
                      <ProgressStrip value={row.ownTechnologyRatio} targetRatio={targetRatio} mode="technology" />
                    </div>
                  ),
              },
              {
                key: "ratio",
                header: "% по тех.",
                className: "text-right",
                cell: (row) => formatPercent(row.ownTechnologyRatio),
              },
              {
                key: "time",
                header: "Всего н-ч",
                className: "text-right",
                cell: (row) => formatHours(row.totalTime),
              },
              {
                key: "tech-time",
                header: "н-ч по тех.",
                className: "text-right",
                cell: (row) => formatHours(row.technologyTime),
              },
              {
                key: "operations",
                header: "Операций",
                className: "text-right",
                cell: (row) => row.operationCount.toLocaleString("ru-RU"),
              },
              {
                key: "status",
                header: "Статус",
                cell: (row) => (
                  <Badge variant={statusLabel(row, targetRatio) === "Цель достигнута" ? "success" : "warning"}>
                    {statusLabel(row, targetRatio)}
                  </Badge>
                ),
              },
            ]}
          />
        )
      )}
    </SectionCard>
  );
}

function SszDashboard({ report }: { report: ImportedReport }) {
  const defaultFilters = useMemo(() => initialFilters(report.period), [report.period]);
  const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters(report.period));
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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-3 lg:self-start">
        <SszFilterSidebar operations={operations} filters={filters} onChange={setFilters} onReset={resetFilters} />
      </div>

      <div className="grid gap-4">
        <FilterStatusBar chips={activeFilterChips(filters, defaultFilters, patchFilters)} />

        <SszKpiCards data={kpis} targetPercent={filters.targetPercent} />

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

        <SectionCard
          title="Срезы по технологии"
          description="Доля работ по технологии по заказам, цехам, мастерам и операциям."
          Icon={Gauge}
        >
          <div className="grid gap-4">
            <TechnologyBoardCard
              title="Заказы"
              subtitle="Ранжирование по общему объему нормо-часов."
              Icon={FileSpreadsheet}
              rows={orderRows}
              targetRatio={targetRatio}
              onRowClick={selectOrder}
              layout="compact-list"
            />

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





