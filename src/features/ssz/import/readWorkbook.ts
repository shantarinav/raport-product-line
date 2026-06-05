import { parseSszRows } from "./parseRows";
import type { CellValue, ImportedReport } from "./types";
import { readFileArrayBuffer } from "../../../shared/fileReadCache";
import type * as XLSXType from "xlsx";

const SSZ_PARSE_MAX_COLUMNS = 20;

function cellValue(cell: XLSXType.CellObject | undefined): CellValue {
  if (!cell) return "";
  const value = cell.w ?? cell.v ?? "";
  return value instanceof Date || typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : String(value);
}

function hasCellValue(cell: XLSXType.CellObject | undefined): boolean {
  const value = cellValue(cell);
  if (value instanceof Date) return true;
  return String(value).trim().length > 0;
}

function sheetToSparseRows(XLSX: typeof XLSXType, sheet: XLSXType.WorkSheet): { rows: CellValue[][]; rowNumbers: number[] } {
  const rowsByIndex = new Map<number, CellValue[]>();

  Object.keys(sheet).forEach((address) => {
    if (address.startsWith("!")) return;

    const position = XLSX.utils.decode_cell(address);
    if (position.c >= SSZ_PARSE_MAX_COLUMNS) return;

    const cell = sheet[address];
    if (!hasCellValue(cell)) return;

    const row = rowsByIndex.get(position.r) ?? [];
    row[position.c] = cellValue(cell);
    rowsByIndex.set(position.r, row);
  });

  const entries = Array.from(rowsByIndex.entries()).sort(([left], [right]) => left - right);

  return {
    rows: entries.map(([, row]) => row),
    rowNumbers: entries.map(([rowIndex]) => rowIndex + 1),
  };
}

function sheetToDenseRows(XLSX: typeof XLSXType, sheet: XLSXType.WorkSheet): CellValue[][] {
  return XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
}

export async function readWorkbookFile(file: File): Promise<ImportedReport> {
  const data = await readFileArrayBuffer(file);
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return parseSszRows([], file.name);

  const sheet = workbook.Sheets[sheetName];

  try {
    const { rows, rowNumbers } = sheetToSparseRows(XLSX, sheet);
    const report = parseSszRows(rows, file.name, rowNumbers);
    if (report.errors.length === 0 && report.operationRows.length > 0) return report;
  } catch (error) {
    console.error("Быстрый парсер ССЗ не сработал, используется стандартное чтение.", error);
  }

  return parseSszRows(sheetToDenseRows(XLSX, sheet), file.name);
}
