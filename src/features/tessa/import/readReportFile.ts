import type { NormalizedRecord, QualitySummary, TessaImportResult } from "../types";

const HEADER_KEYS = {
  regNumber: "рег. номер",
  legalEntity: "юр. лицо",
  contractNumber: "номер договора",
  documentType: "тип документа",
  documentDate: "дата",
  author: "автор",
  subject: "тема",
  taskText: "текст задания",
  responsible: "ответственный",
  deadline: "срок",
  newDeadline: "новый срок",
  completionDate: "дата завершения",
  overdue: "просрочка",
  comment: "комментарий",
} as const;

const REQUIRED_COLUMNS = [
  "Рег. номер",
  "Юр. лицо",
  "Номер договора",
  "Тип документа",
  "Дата",
  "Автор",
  "Тема",
  "Текст задания",
  "Ответственный",
  "Срок",
  "Новый срок",
  "Дата завершения",
  "Просрочка",
  "Комментарий",
];

type RawRow = Record<string, string>;

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): RawRow[] {
  const normalizedText = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = normalizedText.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const first = lines[0] ?? "";
  const semicolonCount = (first.match(/;/g) ?? []).length;
  const commaCount = (first.match(/,/g) ?? []).length;
  const delimiter = semicolonCount >= commaCount ? ";" : ",";

  const headers = parseCsvLine(first, delimiter).map(normalizeHeader);
  const rows: RawRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = parseCsvLine(lines[index] ?? "", delimiter);
    const row: RawRow = {};
    headers.forEach((header, headerIndex) => {
      row[header] = String(cells[headerIndex] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const hours = Number(match[4] ?? "0");
    const minutes = Number(match[5] ?? "0");
    const seconds = Number(match[6] ?? "0");
    const date = new Date(year, month, day, hours, minutes, seconds, 0);
    if (
      Number.isFinite(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const fallback = new Date(trimmed);
  return Number.isFinite(fallback.getTime()) ? fallback : null;
}

function parseOverdueText(rawOverdue: string): number {
  const text = rawOverdue.trim().toLowerCase().replace(",", ".");
  if (!text) return 0;
  const match = text.match(/([\d.]+)\s*(час|часа|часов|день|дня|дней)/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1] ?? "0");
  if (!Number.isFinite(value)) return 0;
  const days = (match[2] ?? "").startsWith("час") ? value / 24 : value;
  return Math.round(days * 100) / 100;
}

function readCell(row: RawRow, key: string): string {
  return String(row[key] ?? "").trim();
}

function toTimestamp(date: Date | null): string {
  return date ? String(date.getTime()) : "";
}

function buildDuplicateKey(record: NormalizedRecord): string {
  return [
    record.process,
    record.regNumber,
    record.legalEntity,
    record.contractNumber,
    record.documentType,
    toTimestamp(record.documentDate),
    record.author,
    record.subject,
    record.taskText,
    record.responsible,
    toTimestamp(record.deadline),
    toTimestamp(record.newDeadline),
    toTimestamp(record.completionDate),
    record.rawOverdue,
    record.comment,
  ].join("\u001F");
}

function normalizeRows(rawRows: RawRow[], fileName: string): TessaImportResult {
  const headers = Object.keys(rawRows[0] ?? {});
  const missingRequiredColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(normalizeHeader(column)));
  const now = new Date();

  const quality: QualitySummary = {
    sourceFileName: fileName,
    process: "Согласование",
    rows: rawRows.length,
    missingRequiredColumns,
    invalidDocumentDates: 0,
    invalidDeadlines: 0,
    invalidNewDeadlines: 0,
    invalidCompletionDates: 0,
    openRowsWithoutDeadline: 0,
    duplicateRows: 0,
  };

  const normalized = rawRows.map((row, index) => {
    const documentDateRaw = readCell(row, HEADER_KEYS.documentDate);
    const deadlineRaw = readCell(row, HEADER_KEYS.deadline);
    const newDeadlineRaw = readCell(row, HEADER_KEYS.newDeadline);
    const completionDateRaw = readCell(row, HEADER_KEYS.completionDate);
    const rawOverdue = readCell(row, HEADER_KEYS.overdue);

    const documentDate = parseDate(documentDateRaw);
    const deadline = parseDate(deadlineRaw);
    const newDeadline = parseDate(newDeadlineRaw);
    const completionDate = parseDate(completionDateRaw);

    if (documentDateRaw && !documentDate) quality.invalidDocumentDates += 1;
    if (deadlineRaw && !deadline) quality.invalidDeadlines += 1;
    if (newDeadlineRaw && !newDeadline) quality.invalidNewDeadlines += 1;
    if (completionDateRaw && !completionDate) quality.invalidCompletionDates += 1;

    const isOpen = completionDate === null;
    const hasRawOverdue = rawOverdue.length > 0;
    const isOpenOverdue = Boolean(isOpen && deadline && deadline.getTime() < now.getTime());
    if (isOpen && !deadline) quality.openRowsWithoutDeadline += 1;

    let status: NormalizedRecord["status"] = "Открыто в работе";
    if (completionDate && !hasRawOverdue) status = "В срок";
    if (completionDate && hasRawOverdue) status = "Завершено с просрочкой";
    if (!completionDate && isOpenOverdue) status = "Открыто с просрочкой";

    let overdueDays = parseOverdueText(rawOverdue);
    if (overdueDays === 0 && isOpenOverdue && deadline) {
      overdueDays = Math.round((((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)) * 100)) / 100;
    }

    return {
      id: `agreement-${fileName}-${index}`,
      process: "Согласование" as const,
      regNumber: readCell(row, HEADER_KEYS.regNumber),
      legalEntity: readCell(row, HEADER_KEYS.legalEntity),
      contractNumber: readCell(row, HEADER_KEYS.contractNumber),
      documentType: readCell(row, HEADER_KEYS.documentType) || "Не указан",
      documentDate,
      author: readCell(row, HEADER_KEYS.author) || "Не указан",
      subject: readCell(row, HEADER_KEYS.subject),
      taskText: readCell(row, HEADER_KEYS.taskText),
      responsible: readCell(row, HEADER_KEYS.responsible) || "Не указан",
      deadline,
      newDeadline,
      completionDate,
      rawOverdue,
      overdueDays,
      status,
      isOverdue: hasRawOverdue || isOpenOverdue,
      isOpen,
      comment: readCell(row, HEADER_KEYS.comment),
      sourceFileName: fileName,
    } satisfies NormalizedRecord;
  });

  const seen = new Set<string>();
  const records: NormalizedRecord[] = [];
  normalized.forEach((record) => {
    const key = buildDuplicateKey(record);
    if (seen.has(key)) {
      quality.duplicateRows += 1;
      return;
    }
    seen.add(key);
    records.push(record);
  });

  return { records, quality };
}

function rowsFromSheet(values: unknown[][]): RawRow[] {
  if (values.length === 0) return [];
  const headers = (values[0] ?? []).map((item) => normalizeHeader(String(item ?? "")));
  const rows: RawRow[] = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const line = values[rowIndex] ?? [];
    if (!line.some((cell) => String(cell ?? "").trim().length > 0)) continue;
    const row: RawRow = {};
    headers.forEach((header, headerIndex) => {
      row[header] = String(line[headerIndex] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

export async function readTessaReportFile(file: File): Promise<TessaImportResult> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv")) {
    const text = await file.text();
    return normalizeRows(parseCsvText(text), file.name);
  }

  const arrayBuffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return normalizeRows([], file.name);
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
  return normalizeRows(rowsFromSheet(sheetRows), file.name);
}

