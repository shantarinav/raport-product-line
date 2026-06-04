import { parseSszRows } from "./parseRows";
import type { CellValue, ImportedReport } from "./types";
import { readFileArrayBuffer } from "../../../shared/fileReadCache";

export async function readWorkbookFile(file: File): Promise<ImportedReport> {
  const data = await readFileArrayBuffer(file);
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return parseSszRows([], file.name);

  const rows = XLSX.utils.sheet_to_json<CellValue[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });

  return parseSszRows(rows, file.name);
}
