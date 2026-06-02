import type { CellValue, ImportedReport, OperationRecord, ReportPeriod, SszRecord } from "./types";

const SSZ_PATTERN = /^Сменно-суточное задание\s+(\d+)\s+от\s+(.+)$/i;
const HEADER_WORDS = new Set(["Параметры:", "Подразделение", "Мастер смены", "Сменно-суточное задание", "Продукция"]);

function text(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function parseNumber(value: CellValue): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(value: string): string | null {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toDateTime(value: string): string | null {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return toDateOnly(value);
  return `${match[3]}-${match[2]}-${match[1]}T${match[4].padStart(2, "0")}:${match[5]}:${match[6] ?? "00"}`;
}

function findPeriod(rows: CellValue[][]): ReportPeriod {
  let start: string | null = null;
  let end: string | null = null;

  for (const row of rows.slice(0, 12)) {
    const cells = row.map(text);
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      if (cell.includes("Начало периода")) start = toDateOnly(cell) ?? toDateOnly(cells[index + 1] ?? "");
      if (cell.includes("Конец периода")) end = toDateOnly(cell) ?? toDateOnly(cells[index + 1] ?? "");
    }
  }

  return { start, end, label: start && end ? `${start} - ${end}` : "Не определён" };
}

function sourceId(sourceName: string, period: ReportPeriod): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${sourceName}::${period.label}::${Date.now()}::${randomPart}`;
}

function isDepartment(value: string): boolean {
  return /^\d+\s+/.test(value);
}

function isContextRow(row: CellValue[]): boolean {
  const first = text(row[0]);
  if (!first || HEADER_WORDS.has(first)) return false;
  return !text(row[4]) && !text(row[5]) && !text(row[6]) && !text(row[7]);
}

function finalizeSsz(record: SszRecord): SszRecord {
  if (record.operations.length === 0) return record;
  return {
    ...record,
    technologyTime: record.operations.reduce((sum, operation) => sum + operation.technologyTime, 0),
    noTechnologyTime: record.operations.reduce((sum, operation) => sum + operation.noTechnologyTime, 0),
  };
}

export function parseSszRows(rows: CellValue[][], sourceName: string): ImportedReport {
  const period = findPeriod(rows);
  const id = sourceId(sourceName, period);
  const warnings: ImportedReport["warnings"] = [];
  const errors: string[] = [];
  const sszRecords: SszRecord[] = [];
  const operationRows: OperationRecord[] = [];
  let currentDepartment = "";
  let currentMaster = "";
  let currentSsz: SszRecord | null = null;

  function pushCurrentSsz() {
    if (!currentSsz) return;
    sszRecords.push(finalizeSsz(currentSsz));
    currentSsz = null;
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const first = text(row[0]);
    if (!first) return;

    const match = first.match(SSZ_PATTERN);
    if (match) {
      pushCurrentSsz();
      currentSsz = {
        id: `${id}:ssz:${match[1]}:${rowNumber}`,
        sourceName,
        number: match[1],
        date: toDateTime(match[2]),
        department: currentDepartment,
        master: currentMaster,
        status: text(row[4]),
        technologyTime: parseNumber(row[8]),
        noTechnologyTime: parseNumber(row[9]),
        operations: [],
      };
      return;
    }

    if (isContextRow(row)) {
      if (isDepartment(first)) {
        currentDepartment = first;
        currentMaster = "";
      } else {
        currentMaster = first;
      }
      return;
    }

    const semiProduct = text(row[5]);
    const operation = text(row[6]);
    const technologyTime = parseNumber(row[8]);
    const noTechnologyTime = parseNumber(row[9]);
    const hasOperationData = Boolean(semiProduct && operation);
    const hasTime = technologyTime !== 0 || noTechnologyTime !== 0;
    if (!hasOperationData || !hasTime) return;

    if (!currentSsz) {
      warnings.push({ rowNumber, message: "Строка операции пропущена: не найден контекст ССЗ." });
      return;
    }

    const operationRecord: OperationRecord = {
      id: `${id}:row:${rowNumber}`,
      sourceName,
      rowNumber,
      sszNumber: currentSsz.number,
      sszDate: currentSsz.date,
      department: currentSsz.department,
      master: currentSsz.master,
      status: currentSsz.status,
      product: first,
      kit: text(row[4]),
      semiProduct,
      operation,
      executor: text(row[7]),
      technologyTime,
      noTechnologyTime,
    };
    currentSsz.operations.push(operationRecord);
    operationRows.push(operationRecord);
  });

  pushCurrentSsz();

  if (sszRecords.length === 0) errors.push("Не найдены строки сменно-суточных заданий.");
  const statuses = Array.from(new Set(sszRecords.map((record) => record.status).filter(Boolean))).sort();

  return {
    sourceId: id,
    sourceName,
    importedAt: new Date().toISOString(),
    period,
    statuses,
    sszRecords,
    operationRows,
    warnings,
    errors,
  };
}
