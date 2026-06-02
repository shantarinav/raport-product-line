import { useMemo, useState } from "react";
import { brandIconPath } from "../../shared/brandAssets";
import { formatHours, formatPercent } from "../analytics/metrics";
import type { OperationRecord, ReportPeriod, SszRecord } from "../import/types";
import { KpiCards, type KpiCardData } from "./KpiCards";

type ContributionKind = "department" | "master" | "operation" | "order";
type TechnologyStatusFilter = "all" | "met" | "below";

interface DashboardFilters {
  targetPercent: number;
  selectedOrder: string;
  selectedKit: string;
  selectedDepartment: string;
  selectedMaster: string;
  selectedDateFrom: string;
  selectedDateTo: string;
}

interface ContributionRow {
  key: string;
  departmentKey: string;
  technologyTime: number;
  noTechnologyTime: number;
  totalTime: number;
  operationCount: number;
  technologyOperationCount: number;
  noTechnologyOperationCount: number;
  ownTechnologyRatio: number | null;
  ownNoTechnologyRatio: number | null;
}

function BrandIcon({ name }: { name: string }) {
  return <img className="raport-card-icon" src={brandIconPath(name)} alt="" />;
}

function formatNormHours(hours: number): string {
  return `${formatHours(hours)} н-ч`;
}

function operationScope(records: SszRecord[]): OperationRecord[] {
  return records.flatMap((record) => record.operations);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "ru"),
  );
}

function normalizedText(value: string): string {
  return value.trim();
}

function operationDateKey(value: string | null): string {
  return value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
}

function formatDateChip(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function initialDateFilters(period?: ReportPeriod): Pick<DashboardFilters, "selectedDateFrom" | "selectedDateTo"> {
  return {
    selectedDateFrom: period?.start ?? "",
    selectedDateTo: period?.end ?? "",
  };
}

function initialFilters(period?: ReportPeriod): DashboardFilters {
  return {
    targetPercent: 70,
    selectedOrder: "",
    selectedKit: "",
    selectedDepartment: "",
    selectedMaster: "",
    ...initialDateFilters(period),
  };
}

function dateBounds(operations: OperationRecord[]): { min: string; max: string } {
  const dates = uniqueSorted(operations.map((operation) => operationDateKey(operation.sszDate)));
  return { min: dates[0] ?? "", max: dates.at(-1) ?? "" };
}

function ratio(part: number, total: number): number | null {
  return total <= 0 ? null : part / total;
}

function primaryDepartment(operations: OperationRecord[], fallback: string): string {
  const departmentTimes = new Map<string, number>();
  operations.forEach((operation) => {
    const department = normalizedText(operation.department) || fallback;
    const totalTime = operation.technologyTime + operation.noTechnologyTime;
    departmentTimes.set(department, (departmentTimes.get(department) ?? 0) + totalTime);
  });

  return Array.from(departmentTimes.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? fallback;
}

function groupContributions(operations: OperationRecord[], kind: ContributionKind): ContributionRow[] {
  const groups = new Map<string, OperationRecord[]>();

  operations.forEach((operation) => {
    const key =
      kind === "department"
        ? operation.department
        : kind === "master"
          ? operation.master
          : kind === "operation"
            ? operation.operation
            : operation.product;
    const normalized = normalizedText(key) || "Не заполнено";
    const group = groups.get(normalized);
    if (group) {
      group.push(operation);
    } else {
      groups.set(normalized, [operation]);
    }
  });

  const rows = Array.from(groups.entries()).map(([key, rowsForKey]) => {
    const technologyTime = rowsForKey.reduce((sum, row) => sum + row.technologyTime, 0);
    const noTechnologyTime = rowsForKey.reduce((sum, row) => sum + row.noTechnologyTime, 0);
    const totalTime = technologyTime + noTechnologyTime;

    return {
      key,
      departmentKey: kind === "department" ? key : primaryDepartment(rowsForKey, "Не заполнено"),
      technologyTime,
      noTechnologyTime,
      totalTime,
      operationCount: rowsForKey.length,
      technologyOperationCount: rowsForKey.filter((row) => row.technologyTime > 0).length,
      noTechnologyOperationCount: rowsForKey.filter((row) => row.noTechnologyTime > 0).length,
      ownTechnologyRatio: ratio(technologyTime, totalTime),
      ownNoTechnologyRatio: ratio(noTechnologyTime, totalTime),
    };
  });

  return rows
    .filter((row) => row.totalTime > 0)
    .sort((left, right) => right.totalTime - left.totalTime);
}

function targetTone(value: number | null, targetRatio: number): "low" | "medium" | "high" {
  const ratioValue = value ?? 0;
  if (ratioValue >= targetRatio) return "high";
  if (targetRatio - ratioValue <= 0.1) return "medium";
  return "low";
}

function statusLabel(row: ContributionRow, targetRatio: number): "Цель достигнута" | "Ниже цели" {
  const value = row.ownTechnologyRatio ?? 0;
  return value >= targetRatio ? "Цель достигнута" : "Ниже цели";
}

function statusClass(row: ContributionRow, targetRatio: number): string {
  const value = row.ownTechnologyRatio ?? 0;
  if (value >= targetRatio) return "high";
  return targetRatio - value <= 0.1 ? "medium" : "low";
}

function filterByTechnologyStatus(rows: ContributionRow[], filter: TechnologyStatusFilter, targetRatio: number): ContributionRow[] {
  if (filter === "met") return rows.filter((row) => (row.ownTechnologyRatio ?? 0) >= targetRatio);
  if (filter === "below") return rows.filter((row) => (row.ownTechnologyRatio ?? 0) < targetRatio);
  return rows;
}

function filterOperations(operations: OperationRecord[], filters: DashboardFilters): OperationRecord[] {
  const selectedOrder = normalizedText(filters.selectedOrder);
  const selectedKit = normalizedText(filters.selectedKit);
  const selectedDepartment = normalizedText(filters.selectedDepartment);
  const selectedMaster = normalizedText(filters.selectedMaster);
  return operations.filter((operation) => {
    if (selectedOrder && normalizedText(operation.product) !== selectedOrder) return false;
    if (selectedKit && normalizedText(operation.kit) !== selectedKit) return false;
    if (selectedDepartment && normalizedText(operation.department) !== selectedDepartment) return false;
    if (selectedMaster && normalizedText(operation.master) !== selectedMaster) return false;
    if (filters.selectedDateFrom || filters.selectedDateTo) {
      const date = operationDateKey(operation.sszDate);
      if (!date) return false;
      if (filters.selectedDateFrom && date < filters.selectedDateFrom) return false;
      if (filters.selectedDateTo && date > filters.selectedDateTo) return false;
    }
    return true;
  });
}

function filterRecords(records: SszRecord[], filters: DashboardFilters): SszRecord[] {
  return records
    .map((record) => {
      const operations = filterOperations(record.operations, filters);
      return {
        ...record,
        operations,
        technologyTime: operations.reduce((sum, operation) => sum + operation.technologyTime, 0),
        noTechnologyTime: operations.reduce((sum, operation) => sum + operation.noTechnologyTime, 0),
      };
    })
    .filter((record) => record.operations.length > 0);
}

function kpiData(records: SszRecord[], operations: OperationRecord[]): KpiCardData {
  const technologyTime = records.reduce((sum, record) => sum + record.technologyTime, 0);
  const noTechnologyTime = records.reduce((sum, record) => sum + record.noTechnologyTime, 0);
  const operationTechnologyCount = operations.filter((operation) => operation.technologyTime > 0).length;

  return {
    sszCount: records.length,
    workTechnologyRatio: ratio(technologyTime, technologyTime + noTechnologyTime),
    operationTechnologyRatio: ratio(operationTechnologyCount, operations.length),
  };
}

function MaturitySlider({ value, targetRatio }: { value: number | null; targetRatio: number }) {
  const percent = Math.round((value ?? 0) * 1000) / 10;
  const bounded = Math.max(0, Math.min(100, percent));
  const targetPercent = Math.max(0, Math.min(100, targetRatio * 100));

  return (
    <div className="maturity-slider" aria-label={`Процент по технологии: ${formatPercent(value)}, цель: ${formatPercent(targetRatio)}`}>
      <div className="maturity-track" aria-hidden="true">
        <i className={targetTone(value, targetRatio)} style={{ width: `${bounded}%` }} />
        <span className="maturity-target" style={{ left: `${targetPercent}%` }} />
      </div>
    </div>
  );
}

function TopAllSwitch({ showAll, onChange }: { showAll: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="top-all-switch" aria-label="Режим отображения">
      <button type="button" className={!showAll ? "active" : ""} onClick={() => onChange(false)}>
        ТОП
      </button>
      <button type="button" className={showAll ? "active" : ""} onClick={() => onChange(true)}>
        Все
      </button>
    </div>
  );
}

function TechnologyStatusSwitch({
  value,
  onChange,
}: {
  value: TechnologyStatusFilter;
  onChange: (value: TechnologyStatusFilter) => void;
}) {
  return (
    <div className="top-all-switch technology-status-switch" aria-label="Отбор по цели">
      <button type="button" className={value === "all" ? "active" : ""} onClick={() => onChange("all")}>
        Все
      </button>
      <button type="button" className={value === "met" ? "active" : ""} onClick={() => onChange("met")}>
        Цель достигнута
      </button>
      <button type="button" className={value === "below" ? "active" : ""} onClick={() => onChange("below")}>
        Ниже цели
      </button>
    </div>
  );
}

function TargetControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  function applyValue(nextValue: number) {
    onChange(Math.max(0, Math.min(100, Math.round(nextValue))));
  }

  return (
    <label className="filter-control target-filter-control">
      <span>Целевая доля по технологии</span>
      <div>
        <input
          className="target-number"
          type="number"
          min="0"
          max="100"
          value={value}
          aria-label="Целевая доля по технологии в процентах"
          onChange={(event) => applyValue(Number(event.currentTarget.value))}
        />
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          aria-label="Целевая доля по технологии"
          onChange={(event) => applyValue(Number(event.currentTarget.value))}
        />
      </div>
    </label>
  );
}

function FilterSidebar({
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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [departmentSuggestionsOpen, setDepartmentSuggestionsOpen] = useState(false);
  const [masterSuggestionsOpen, setMasterSuggestionsOpen] = useState(false);
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
  }, [orders, filters.selectedOrder]);
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
    [peopleContextOperations, filters.selectedMaster],
  );
  const masters = useMemo(
    () =>
      uniqueSorted(
        peopleContextOperations
          .filter((operation) => !filters.selectedDepartment || normalizedText(operation.department) === normalizedText(filters.selectedDepartment))
          .map((operation) => operation.master),
      ),
    [peopleContextOperations, filters.selectedDepartment],
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
  }, [masters, filters.selectedMaster]);

  function update(nextFilters: Partial<DashboardFilters>) {
    onChange({ ...filters, ...nextFilters });
  }

  function changeOrder(value: string, commit = false) {
    const nextFilters: Partial<DashboardFilters> = { selectedOrder: value, selectedKit: "" };
    if (!value || commit || orders.includes(value)) {
      const orderOperations = filterOperations(operations, {
        ...filters,
        selectedOrder: value,
        selectedKit: "",
        selectedDepartment: "",
        selectedMaster: "",
      });
      const availableDepartments = uniqueSorted(orderOperations.map((operation) => operation.department));
      const availableMasters = uniqueSorted(orderOperations.map((operation) => operation.master));
      nextFilters.selectedDepartment =
        filters.selectedDepartment && !availableDepartments.includes(filters.selectedDepartment) ? "" : filters.selectedDepartment;
      nextFilters.selectedMaster = filters.selectedMaster && !availableMasters.includes(filters.selectedMaster) ? "" : filters.selectedMaster;
    }
    update(nextFilters);
  }

  function changeDepartment(value: string) {
    const availableMasters = uniqueSorted(
      peopleContextOperations
        .filter((operation) => !value || normalizedText(operation.department) === normalizedText(value))
        .map((operation) => operation.master),
    );
    const nextMaster = filters.selectedMaster && !availableMasters.includes(filters.selectedMaster) ? "" : filters.selectedMaster;
    const availableOrders = uniqueSorted(
      filterOperations(operations, {
        ...filters,
        selectedOrder: "",
        selectedKit: "",
        selectedDepartment: value,
        selectedMaster: nextMaster,
      }).map((operation) => operation.product),
    );
    const nextOrder = filters.selectedOrder && !availableOrders.includes(filters.selectedOrder) ? "" : filters.selectedOrder;
    update({
      selectedDepartment: value,
      selectedMaster: nextMaster,
      selectedOrder: nextOrder,
      selectedKit: nextOrder ? filters.selectedKit : "",
    });
  }

  function changeMaster(value: string) {
    const availableDepartments = uniqueSorted(
      peopleContextOperations
        .filter((operation) => !value || normalizedText(operation.master) === normalizedText(value))
        .map((operation) => operation.department),
    );
    const nextDepartment =
      filters.selectedDepartment && !availableDepartments.includes(filters.selectedDepartment) ? "" : filters.selectedDepartment;
    const availableOrders = uniqueSorted(
      filterOperations(operations, {
        ...filters,
        selectedOrder: "",
        selectedKit: "",
        selectedDepartment: nextDepartment,
        selectedMaster: value,
      }).map((operation) => operation.product),
    );
    const nextOrder = filters.selectedOrder && !availableOrders.includes(filters.selectedOrder) ? "" : filters.selectedOrder;
    update({
      selectedMaster: value,
      selectedDepartment: nextDepartment,
      selectedOrder: nextOrder,
      selectedKit: nextOrder ? filters.selectedKit : "",
    });
  }

  return (
    <aside className="dashboard-sidebar" aria-label="Фильтры">
      <div className="raport-panel-title">
        <BrandIcon name="icon-filter.png" />
        <div>
          <strong>Фильтры</strong>
          <span>Поля применяются автоматически.</span>
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-group-title">Цель</span>
        <TargetControl value={filters.targetPercent} onChange={(targetPercent) => update({ targetPercent })} />
      </div>

      <div className="filter-group">
        <span className="filter-group-title">Область данных</span>
        <label className="filter-control">
          <span>Заказ</span>
          <div className="order-combobox">
            <input
              aria-controls="order-options"
              aria-expanded={suggestionsOpen && visibleOrders.length > 0}
              aria-label="Номер заказа"
              autoComplete="off"
              role="combobox"
              value={filters.selectedOrder}
              placeholder="Все заказы"
              onBlur={() => setSuggestionsOpen(false)}
              onChange={(event) => {
                changeOrder(event.currentTarget.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
            />
            {suggestionsOpen && visibleOrders.length > 0 && (
              <ul className="order-suggestions" id="order-options" role="listbox">
                {visibleOrders.map((order) => (
                  <li key={order} role="option" aria-selected={order === filters.selectedOrder}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        changeOrder(order, true);
                        setSuggestionsOpen(false);
                      }}
                    >
                      {order}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>

        <label className="filter-control">
          <span>Комплект</span>
          <select
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
          </select>
        </label>
      </div>

      <div className="filter-group">
        <span className="filter-group-title">Ответственные</span>
        <label className="filter-control">
          <span>Цех</span>
          <div className="order-combobox">
            <input
              aria-controls="department-options"
              aria-expanded={departmentSuggestionsOpen && visibleDepartments.length > 0}
              aria-label="Цех"
              autoComplete="off"
              role="combobox"
              value={filters.selectedDepartment}
              placeholder={filters.selectedMaster ? "Все цеха мастера" : "Все цеха"}
              onBlur={() => setDepartmentSuggestionsOpen(false)}
              onChange={(event) => {
                changeDepartment(event.currentTarget.value);
                setDepartmentSuggestionsOpen(true);
              }}
              onFocus={() => setDepartmentSuggestionsOpen(true)}
            />
            {departmentSuggestionsOpen && visibleDepartments.length > 0 && (
              <ul className="order-suggestions" id="department-options" role="listbox">
                {visibleDepartments.map((department) => (
                  <li key={department} role="option" aria-selected={department === filters.selectedDepartment}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        changeDepartment(department);
                        setDepartmentSuggestionsOpen(false);
                      }}
                    >
                      {department}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>

        <label className="filter-control">
          <span>Мастер</span>
          <div className="order-combobox">
            <input
              aria-controls="master-options"
              aria-expanded={masterSuggestionsOpen && visibleMasters.length > 0}
              aria-label="Мастер"
              autoComplete="off"
              role="combobox"
              value={filters.selectedMaster}
              placeholder={filters.selectedDepartment ? "Все мастера цеха" : "Все мастера"}
              onBlur={() => setMasterSuggestionsOpen(false)}
              onChange={(event) => {
                changeMaster(event.currentTarget.value);
                setMasterSuggestionsOpen(true);
              }}
              onFocus={() => setMasterSuggestionsOpen(true)}
            />
            {masterSuggestionsOpen && visibleMasters.length > 0 && (
              <ul className="order-suggestions" id="master-options" role="listbox">
                {visibleMasters.map((master) => (
                  <li key={master} role="option" aria-selected={master === filters.selectedMaster}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        changeMaster(master);
                        setMasterSuggestionsOpen(false);
                      }}
                    >
                      {master}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>
      </div>

      <div className="filter-group">
        <span className="filter-group-title">Период</span>
        <label className="filter-control">
          <span>Дата с</span>
          <input
            aria-label="Дата с"
            type="date"
            value={filters.selectedDateFrom}
            min={bounds.min}
            max={bounds.max}
            onChange={(event) => update({ selectedDateFrom: event.currentTarget.value })}
          />
        </label>

        <label className="filter-control">
          <span>Дата по</span>
          <input
            aria-label="Дата по"
            type="date"
            value={filters.selectedDateTo}
            min={bounds.min}
            max={bounds.max}
            onChange={(event) => update({ selectedDateTo: event.currentTarget.value })}
          />
        </label>
      </div>

      <button type="button" className="reset-filters-button" onClick={onReset}>
        Сбросить фильтры
      </button>
    </aside>
  );
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

function MasterLeaderboard({
  title,
  description,
  ariaLabel,
  rows,
  emptyText,
  tone,
  targetRatio,
  onMasterClick,
}: {
  title: string;
  description: string;
  ariaLabel: string;
  rows: ContributionRow[];
  emptyText: string;
  tone: "support" | "growth";
  targetRatio: number;
  onMasterClick: (master: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const scopedRows = rows.filter((row) => {
    const technologyRatio = row.ownTechnologyRatio ?? 0;
    return tone === "support"
      ? technologyRatio >= targetRatio
      : row.noTechnologyTime > 0 || row.noTechnologyOperationCount > 0;
  });
  const ordered = leaderboardRows(scopedRows, tone === "support" ? "leaders" : "attention");
  const visibleRows = showAll ? ordered : ordered.slice(0, 5);
  const sortTitle =
    tone === "support"
      ? "Сортировка: нормо-часы по технологии, затем операции по технологии, затем доля по технологии."
      : "Сортировка: нормо-часы без технологии, затем операции без технологии, затем меньшая доля по технологии.";
  const headers =
    tone === "support"
      ? { percent: "% по тех.", hours: "н-ч по тех.", operations: "опер. по тех." }
      : { percent: "% без тех.", hours: "н-ч без тех.", operations: "опер. без тех." };

  return (
    <article
      className={`executive-insight ${tone}`}
      title={sortTitle}
    >
      <div className="widget-title-with-switch">
        <div className="support-summary raport-panel-title">
          <BrandIcon name={tone === "support" ? "icon-success.png" : "icon-deviation.png"} />
          <div>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        </div>
        {ordered.length > 5 && <TopAllSwitch showAll={showAll} onChange={setShowAll} />}
      </div>
      {visibleRows.length > 0 ? (
        <>
          <div className="support-leaderboard-head" aria-hidden="true">
            <span />
            <span>Мастер</span>
            <span>{headers.percent}</span>
            <span>{headers.hours}</span>
            <span>{headers.operations}</span>
          </div>
          <ol className="support-leaderboard" aria-label={ariaLabel}>
            {visibleRows.map((row, index) => {
              const displayedRatio = tone === "support" ? row.ownTechnologyRatio : row.ownNoTechnologyRatio;
              const displayedTime = tone === "support" ? row.technologyTime : row.noTechnologyTime;
              const displayedOperations = tone === "support" ? row.technologyOperationCount : row.noTechnologyOperationCount;
              const percent = Math.max(0, Math.min(100, (displayedRatio ?? 0) * 100));
              const severityClass = tone === "growth" ? `growth-${growthSeverity(displayedRatio)}` : "";
              return (
                <li key={row.key} className={severityClass}>
                  <span className="support-rank">#{index + 1}</span>
                  <button type="button" className="support-master-link" onClick={() => onMasterClick(row.key)} aria-label={`Выбрать мастера ${row.key}`}>
                    {row.key}
                  </button>
                  <strong>
                    {formatPercent(displayedRatio)}
                  </strong>
                  <span>{formatNormHours(displayedTime)}</span>
                  <span>{displayedOperations.toLocaleString("ru-RU")} опер.</span>
                  <i aria-hidden="true">
                    <b style={{ width: `${percent}%` }} />
                  </i>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <span>{emptyText}</span>
      )}
    </article>
  );
}

function ActiveFilterSummary({ filters }: { filters: DashboardFilters }) {
  const periodLabel =
    filters.selectedDateFrom && filters.selectedDateTo
      ? `Период: ${formatDateChip(filters.selectedDateFrom)} - ${formatDateChip(filters.selectedDateTo)}`
      : filters.selectedDateFrom
        ? `Период: с ${formatDateChip(filters.selectedDateFrom)}`
        : filters.selectedDateTo
          ? `Период: по ${formatDateChip(filters.selectedDateTo)}`
          : "";
  const selectedItems = [
    filters.selectedOrder ? { label: `Заказ: ${filters.selectedOrder}`, tone: "selected" } : null,
    filters.selectedKit ? { label: `Комплект: ${filters.selectedKit}`, tone: "selected" } : null,
    filters.selectedDepartment ? { label: `Цех: ${filters.selectedDepartment}`, tone: "selected" } : null,
    filters.selectedMaster ? { label: `Мастер: ${filters.selectedMaster}`, tone: "selected" } : null,
    periodLabel ? { label: periodLabel, tone: "selected" } : null,
  ].filter((item): item is { label: string; tone: string } => Boolean(item));
  const items =
    selectedItems.length > 0
      ? [{ label: `Цель ≥ ${filters.targetPercent}%`, tone: "target" }, ...selectedItems]
      : [
          { label: "все данные", tone: "neutral" },
          { label: `Цель ≥ ${filters.targetPercent}%`, tone: "target" },
        ];

  return (
    <div className="active-filter-summary" aria-label="Активные фильтры">
      <strong>Активные фильтры</strong>
      <div>
        {items.map((item) => (
          <span className={`filter-chip ${item.tone}`} key={item.label}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TechnologyBoard({
  title,
  subtitle,
  rows,
  targetRatio,
  icon,
  enableStatusFilter = false,
  selectedSummary,
  selectedKey,
  onRowClick,
  rowButtonAriaLabel,
  onReset,
}: {
  title: string;
  subtitle: string;
  rows: ContributionRow[];
  targetRatio: number;
  icon: string;
  enableStatusFilter?: boolean;
  selectedSummary?: ContributionRow;
  selectedKey?: string;
  onRowClick?: (key: string) => void;
  rowButtonAriaLabel?: (key: string) => string;
  onReset?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TechnologyStatusFilter>("all");
  const scopedRows = useMemo(
    () => (enableStatusFilter ? filterByTechnologyStatus(rows, statusFilter, targetRatio) : rows),
    [enableStatusFilter, rows, statusFilter, targetRatio],
  );
  const visibleRows = showAll ? scopedRows : scopedRows.slice(0, 5);

  return (
    <article className="pareto-board technology-maturity">
      <header className="pareto-header">
        <div className="raport-widget-title">
          <BrandIcon name={icon} />
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            {enableStatusFilter && <TechnologyStatusSwitch value={statusFilter} onChange={setStatusFilter} />}
          </div>
        </div>
        <div className="widget-switch-group">
          {scopedRows.length > 5 && <TopAllSwitch showAll={showAll} onChange={setShowAll} />}
        </div>
      </header>

      {selectedKey && onReset && (
        <div className="selected-filter selected-context">
          <span>
            {selectedSummary
              ? `${selectedSummary.key}: ${formatPercent(selectedSummary.ownTechnologyRatio)} по технологии, ${formatHours(selectedSummary.noTechnologyTime)} ч без технологии`
              : `Выбран цех: ${selectedKey}`}
          </span>
          <button type="button" onClick={onReset}>
            Все цеха
          </button>
        </div>
      )}

      {visibleRows.length === 0 ? (
        <p className="pareto-empty">Нет данных для текущей выборки.</p>
      ) : (
        <ol className="pareto-list maturity-list">
          {visibleRows.map((row) => {
            const status = statusLabel(row, targetRatio);
            const rowContent = (
              <>
                <span className="pareto-name" title={row.key}>
                  {row.key}
                </span>
                <strong>{formatPercent(row.ownTechnologyRatio)}</strong>
              </>
            );

            return (
              <li key={row.key} className={selectedKey === row.key ? "active" : ""}>
                <div className="pareto-row-main">
                  {onRowClick ? (
                    <button
                      type="button"
                      className="pareto-link"
                      onClick={() => onRowClick(row.key)}
                      aria-label={rowButtonAriaLabel?.(row.key) ?? `Показать мастеров цеха ${row.key}`}
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div className="pareto-static">{rowContent}</div>
                  )}
                  <em className={`pareto-badge ${statusClass(row, targetRatio)}`}>{status}</em>
                </div>

                <MaturitySlider value={row.ownTechnologyRatio} targetRatio={targetRatio} />

                <div className="pareto-meta">
                  <div className="pareto-meta-left">
                    <span title="Общий объем работ: нормо-часы по технологии плюс нормо-часы без технологии.">
                      {formatNormHours(row.totalTime)} всего
                    </span>
                    <span title="Объем и количество операций, оформленных по технологии.">
                      {formatNormHours(row.technologyTime)} · {row.technologyOperationCount.toLocaleString("ru-RU")} опер. по тех.
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

    </article>
  );
}

export function RankingWidgets({ records, period }: { records: SszRecord[]; period?: ReportPeriod }) {
  const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters(period));
  const targetRatio = filters.targetPercent / 100;

  const operations = useMemo(() => operationScope(records), [records]);
  const filteredRecords = useMemo(() => filterRecords(records, filters), [records, filters]);
  const filteredOperations = useMemo(() => operationScope(filteredRecords), [filteredRecords]);
  const departmentRows = useMemo(() => groupContributions(filteredOperations, "department"), [filteredOperations]);
  const orderRows = useMemo(() => groupContributions(filteredOperations, "order"), [filteredOperations]);
  const masterRows = useMemo(() => groupContributions(filteredOperations, "master"), [filteredOperations]);
  const operationRows = useMemo(() => groupContributions(filteredOperations, "operation"), [filteredOperations]);
  const kpis = useMemo(() => kpiData(filteredRecords, filteredOperations), [filteredRecords, filteredOperations]);

  function updateFilters(nextFilters: DashboardFilters) {
    setFilters(nextFilters);
  }

  function selectOrder(order: string) {
    setFilters((current) => {
      const orderOperations = filterOperations(operations, {
        ...current,
        selectedOrder: order,
        selectedKit: "",
        selectedDepartment: "",
        selectedMaster: "",
      });
      const availableDepartments = uniqueSorted(orderOperations.map((operation) => operation.department));
      const availableMasters = uniqueSorted(orderOperations.map((operation) => operation.master));
      return {
        ...current,
        selectedOrder: order,
        selectedKit: "",
        selectedDepartment:
          current.selectedDepartment && !availableDepartments.includes(current.selectedDepartment) ? "" : current.selectedDepartment,
        selectedMaster: current.selectedMaster && !availableMasters.includes(current.selectedMaster) ? "" : current.selectedMaster,
      };
    });
  }

  function selectDepartment(department: string) {
    setFilters((current) => {
      const nextMaster =
        current.selectedMaster &&
        !operations.some(
          (operation) =>
            normalizedText(operation.department) === normalizedText(department) &&
            normalizedText(operation.master) === normalizedText(current.selectedMaster),
        )
          ? ""
          : current.selectedMaster;
      const availableOrders = uniqueSorted(
        filterOperations(operations, {
          ...current,
          selectedOrder: "",
          selectedKit: "",
          selectedDepartment: department,
          selectedMaster: nextMaster,
        }).map((operation) => operation.product),
      );
      const nextOrder = current.selectedOrder && !availableOrders.includes(current.selectedOrder) ? "" : current.selectedOrder;
      return {
        ...current,
        selectedDepartment: department,
        selectedMaster: nextMaster,
        selectedOrder: nextOrder,
        selectedKit: nextOrder ? current.selectedKit : "",
      };
    });
  }

  function selectMaster(master: string) {
    setFilters((current) => {
      const masterDepartments = uniqueSorted(
        operations
          .filter((operation) => normalizedText(operation.master) === normalizedText(master))
          .map((operation) => operation.department),
      );
      const nextDepartment =
        masterDepartments.length === 1
          ? masterDepartments[0]
          : current.selectedDepartment && masterDepartments.includes(current.selectedDepartment)
            ? current.selectedDepartment
            : "";
      const availableOrders = uniqueSorted(
        filterOperations(operations, {
          ...current,
          selectedOrder: "",
          selectedKit: "",
          selectedDepartment: nextDepartment,
          selectedMaster: master,
        }).map((operation) => operation.product),
      );
      const nextOrder = current.selectedOrder && !availableOrders.includes(current.selectedOrder) ? "" : current.selectedOrder;
      return {
        ...current,
        selectedMaster: master,
        selectedDepartment: nextDepartment,
        selectedOrder: nextOrder,
        selectedKit: nextOrder ? current.selectedKit : "",
      };
    });
  }

  function resetFilters() {
    setFilters(initialFilters(period));
  }

  return (
    <section className="dashboard-workspace" aria-label="Рапорт: качество оформления ССЗ">
      <FilterSidebar operations={operations} filters={filters} onChange={updateFilters} onReset={resetFilters} />

      <div className="dashboard-main">
        <ActiveFilterSummary filters={filters} />
        <KpiCards data={kpis} targetPercent={filters.targetPercent} />

        <div className="insight-grid">
          <MasterLeaderboard
            title="Лидеры по технологии"
            description="Мастера, достигшие целевой доли по технологии."
            ariaLabel="Лидеры по технологии"
            rows={masterRows}
            emptyText="Нет мастеров, достигших целевой доли по технологии."
            tone="support"
            targetRatio={targetRatio}
            onMasterClick={selectMaster}
          />
          <MasterLeaderboard
            title="Зона внимания"
            description="Мастера с наибольшим объемом работ, оформленных не по технологии"
            ariaLabel="Зона внимания"
            rows={masterRows}
            emptyText="Нет работ, оформленных не по технологии, в текущей выборке."
            tone="growth"
            targetRatio={targetRatio}
            onMasterClick={selectMaster}
          />
        </div>

        <section className="slices-section" aria-label="Срезы по технологии">
          <div className="slices-heading">
            <strong>Срезы по технологии</strong>
            <span>Доля работ по технологии по заказам, цехам, мастерам и операциям.</span>
          </div>

          <TechnologyBoard
            title="Заказы"
            subtitle="Ранжирование по общему объему нормо-часов."
            rows={orderRows}
            targetRatio={targetRatio}
            icon="icon-source.png"
            onRowClick={selectOrder}
            rowButtonAriaLabel={(order) => `Выбрать заказ ${order}`}
            enableStatusFilter
          />

          <div className="contribution-grid">
          <TechnologyBoard
            title="Цеха"
            subtitle="Ранжирование по общему объему нормо-часов."
            rows={departmentRows}
            targetRatio={targetRatio}
            icon="icon-workshop.png"
            selectedKey={filters.selectedDepartment}
            onRowClick={selectDepartment}
            rowButtonAriaLabel={(department) => `Выбрать цех ${department}`}
            enableStatusFilter
          />
          <TechnologyBoard
            title={filters.selectedDepartment ? "Мастера цеха" : "Мастера"}
            subtitle={filters.selectedDepartment ? `Мастера выбранного цеха: ${filters.selectedDepartment}` : "Рейтинг мастеров в текущей выборке."}
            rows={masterRows}
            targetRatio={targetRatio}
            icon="icon-user.png"
            selectedKey={filters.selectedMaster}
            onRowClick={selectMaster}
            rowButtonAriaLabel={(master) => `Выбрать мастера ${master}`}
            enableStatusFilter
          />
          <TechnologyBoard
            title={filters.selectedDepartment ? "Операции цеха" : "Операции"}
            subtitle={filters.selectedDepartment ? `Операции выбранного цеха: ${filters.selectedDepartment}` : "Операции с учетом текущих фильтров."}
            rows={operationRows}
            targetRatio={targetRatio}
            icon="icon-settings.png"
            enableStatusFilter
          />
        </div>
        </section>
      </div>
    </section>
  );
}
