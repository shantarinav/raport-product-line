import type { PrintImportResult, PrintRawRecord } from "../types";
import { missingRequiredColumns, normalizePrintRow } from "../logic/dashboard";
import { readFileArrayBuffer, readFileText } from "../../../shared/fileReadCache";

function detectCsvDelimiter(line: string) {
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

function rowsToRecords(rows: unknown[][]): PrintRawRecord[] {
  const firstDataRowIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? "").trim().length > 0));
  if (firstDataRowIndex < 0) return [];

  const header = rows[firstDataRowIndex].map((cell) => String(cell ?? "").replace(/^\uFEFF/, "").trim());
  return rows.slice(firstDataRowIndex + 1).flatMap((cells) => {
    if (!cells.some((cell) => String(cell ?? "").trim().length > 0)) return [];
    const record: PrintRawRecord = {};
    header.forEach((name, index) => {
      if (!name) return;
      record[name] = String(cells[index] ?? "").trim();
    });
    return [record];
  });
}

async function readCsvRecords(file: File): Promise<PrintRawRecord[]> {
  const text = await readFileText(file);
  const normalizedText = text.replace(/^\uFEFF/, "");
  const firstLine = normalizedText
    .replace(/\r/g, "")
    .split("\n")
    .find((line) => line.trim().length > 0);
  if (!firstLine) return [];
  return rowsToRecords(parseDelimitedRows(normalizedText, detectCsvDelimiter(firstLine)));
}

async function readWorkbookRecords(file: File): Promise<PrintRawRecord[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await readFileArrayBuffer(file), { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
  return rowsToRecords(rows);
}

export async function readPrintReportFile(file: File): Promise<PrintImportResult> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const rawRecords = isCsv ? await readCsvRecords(file) : await readWorkbookRecords(file);
  const missingColumns = missingRequiredColumns(rawRecords[0] ?? null);

  return {
    rawRecords,
    jobs: missingColumns.length === 0 ? rawRecords.map(normalizePrintRow) : [],
    file: {
      fileName: file.name,
      loadedAt: new Date().toISOString(),
    },
    quality: {
      missingRequiredColumns: missingColumns,
    },
  };
}
