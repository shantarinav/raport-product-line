import { parseSszRows } from "./parseRows";
import type { CellValue, ImportedReport } from "./types";

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function readWorkbookFile(file: File): Promise<ImportedReport> {
  const data = await fileToArrayBuffer(file);
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
