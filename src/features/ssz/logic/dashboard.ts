import type { OperationRecord, ReportPeriod, SszRecord } from "../import/types";

export type ContributionKind = "department" | "master" | "operation" | "order";

export interface DashboardFilters {
  targetPercent: number;
  selectedOrder: string;
  selectedKit: string;
  selectedDepartment: string;
  selectedMaster: string;
  selectedOperation: string;
  selectedDateFrom: string;
  selectedDateTo: string;
}

export interface ContributionRow {
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

export interface KpiCardData {
  sszCount: number;
  workTechnologyRatio: number | null;
  operationTechnologyRatio: number | null;
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "ru"),
  );
}

export function normalizedText(value: string): string {
  return value.trim();
}

export function operationDateKey(value: string | null): string {
  return value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
}

export function formatDateChip(value: string): string {
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

export function initialFilters(period?: ReportPeriod): DashboardFilters {
  return {
    targetPercent: 70,
    selectedOrder: "",
    selectedKit: "",
    selectedDepartment: "",
    selectedMaster: "",
    selectedOperation: "",
    ...initialDateFilters(period),
  };
}

export function operationScope(records: SszRecord[]): OperationRecord[] {
  return records.flatMap((record) => record.operations);
}

export function dateBounds(operations: OperationRecord[]): { min: string; max: string } {
  const dates = uniqueSorted(operations.map((operation) => operationDateKey(operation.sszDate)));
  return { min: dates[0] ?? "", max: dates[dates.length - 1] ?? "" };
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

export function groupContributions(operations: OperationRecord[], kind: ContributionKind): ContributionRow[] {
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
    const normalized = normalizedText(key) || "Не задано";
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
      departmentKey: kind === "department" ? key : primaryDepartment(rowsForKey, "Не задано"),
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

export function filterOperations(operations: OperationRecord[], filters: DashboardFilters): OperationRecord[] {
  const selectedOrder = normalizedText(filters.selectedOrder);
  const selectedKit = normalizedText(filters.selectedKit);
  const selectedDepartment = normalizedText(filters.selectedDepartment);
  const selectedMaster = normalizedText(filters.selectedMaster);
  const selectedOperation = normalizedText(filters.selectedOperation);

  return operations.filter((operation) => {
    if (selectedOrder && normalizedText(operation.product) !== selectedOrder) return false;
    if (selectedKit && normalizedText(operation.kit) !== selectedKit) return false;
    if (selectedDepartment && normalizedText(operation.department) !== selectedDepartment) return false;
    if (selectedMaster && normalizedText(operation.master) !== selectedMaster) return false;
    if (selectedOperation && normalizedText(operation.operation) !== selectedOperation) return false;

    if (filters.selectedDateFrom || filters.selectedDateTo) {
      const date = operationDateKey(operation.sszDate);
      if (!date) return false;
      if (filters.selectedDateFrom && date < filters.selectedDateFrom) return false;
      if (filters.selectedDateTo && date > filters.selectedDateTo) return false;
    }

    return true;
  });
}

export function filterRecords(records: SszRecord[], filters: DashboardFilters): SszRecord[] {
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

export function kpiData(records: SszRecord[], operations: OperationRecord[]): KpiCardData {
  const technologyTime = records.reduce((sum, record) => sum + record.technologyTime, 0);
  const noTechnologyTime = records.reduce((sum, record) => sum + record.noTechnologyTime, 0);
  const operationTechnologyCount = operations.filter((operation) => operation.technologyTime > 0).length;

  return {
    sszCount: records.length,
    workTechnologyRatio: ratio(technologyTime, technologyTime + noTechnologyTime),
    operationTechnologyRatio: ratio(operationTechnologyCount, operations.length),
  };
}

export function applyOrderSelection(current: DashboardFilters, operations: OperationRecord[], order: string): DashboardFilters {
  const orderOperations = filterOperations(operations, {
    ...current,
    selectedOrder: order,
    selectedKit: "",
    selectedDepartment: "",
    selectedMaster: "",
    selectedOperation: "",
  });

  const availableDepartments = uniqueSorted(orderOperations.map((operation) => operation.department));
  const availableMasters = uniqueSorted(orderOperations.map((operation) => operation.master));
  const availableOperations = uniqueSorted(orderOperations.map((operation) => operation.operation));

  return {
    ...current,
    selectedOrder: order,
    selectedKit: "",
    selectedDepartment:
      current.selectedDepartment && !availableDepartments.includes(current.selectedDepartment) ? "" : current.selectedDepartment,
    selectedMaster: current.selectedMaster && !availableMasters.includes(current.selectedMaster) ? "" : current.selectedMaster,
    selectedOperation: current.selectedOperation && !availableOperations.includes(current.selectedOperation) ? "" : current.selectedOperation,
  };
}

export function applyDepartmentSelection(
  current: DashboardFilters,
  operations: OperationRecord[],
  department: string,
): DashboardFilters {
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
  const availableOperations = uniqueSorted(
    filterOperations(operations, {
      ...current,
      selectedOrder: nextOrder,
      selectedKit: nextOrder ? current.selectedKit : "",
      selectedDepartment: department,
      selectedMaster: nextMaster,
      selectedOperation: "",
    }).map((operation) => operation.operation),
  );

  return {
    ...current,
    selectedDepartment: department,
    selectedMaster: nextMaster,
    selectedOrder: nextOrder,
    selectedKit: nextOrder ? current.selectedKit : "",
    selectedOperation: current.selectedOperation && !availableOperations.includes(current.selectedOperation) ? "" : current.selectedOperation,
  };
}

export function applyMasterSelection(current: DashboardFilters, operations: OperationRecord[], master: string): DashboardFilters {
  const masterDepartments = uniqueSorted(
    operations.filter((operation) => normalizedText(operation.master) === normalizedText(master)).map((operation) => operation.department),
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
  const availableOperations = uniqueSorted(
    filterOperations(operations, {
      ...current,
      selectedOrder: nextOrder,
      selectedKit: nextOrder ? current.selectedKit : "",
      selectedDepartment: nextDepartment,
      selectedMaster: master,
      selectedOperation: "",
    }).map((operation) => operation.operation),
  );

  return {
    ...current,
    selectedMaster: master,
    selectedDepartment: nextDepartment,
    selectedOrder: nextOrder,
    selectedKit: nextOrder ? current.selectedKit : "",
    selectedOperation: current.selectedOperation && !availableOperations.includes(current.selectedOperation) ? "" : current.selectedOperation,
  };
}
