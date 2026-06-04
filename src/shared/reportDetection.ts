import { readFileArrayBuffer } from "./fileReadCache";

export type DetectedReportType = "ssz" | "tessa" | "print" | "support";

export type ReportDetectionResult =
  | { type: DetectedReportType; matchedTypes: DetectedReportType[] }
  | { type: "unknown"; matchedTypes: [] }
  | { type: "ambiguous"; matchedTypes: DetectedReportType[] };

const XLSX_DETECTION_ROWS = 120;
const CSV_DETECTION_BYTES = 256 * 1024;


function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

function compact(value: unknown): string {
  return normalizeText(value).replace(/[^\p{L}\p{N}№]+/gu, "");
}

function detectCsvDelimiter(line: string) {
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  return semicolonCount >= commaCount ? ";" : ",";
}

function parseDelimitedRows(text: string, delimiter: string, maxRows = XLSX_DETECTION_ROWS): string[][] {
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
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      value = "";
      if (rows.length >= maxRows) return rows;
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  return rows.slice(0, maxRows);
}

async function readPreviewRows(file: File): Promise<unknown[][]> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = (await file.slice(0, CSV_DETECTION_BYTES).text()).replace(/^\uFEFF/, "");
    const firstLine = text.replace(/\r/g, "").split("\n").find((line) => line.trim().length > 0) ?? "";
    return parseDelimitedRows(text, detectCsvDelimiter(firstLine));
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await readFileArrayBuffer(file), {
    type: "array",
    cellDates: true,
    sheetRows: XLSX_DETECTION_ROWS,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
}

function rowSets(rows: unknown[][]): Set<string>[] {
  return rows.map((row) => new Set(row.map(compact).filter(Boolean)));
}

function supportHeaderKey(value: unknown): "ticketNumber" | "topic" | "createdAt" | "slaPlan" | "slaFact" | null {
  const normalized = compact(value)
    .replace(/номерзаявки/g, "№")
    .replace(/номер/g, "№");

  if (["№", "n", "no", "id", "ticketid", "ticketnumber", "заявка"].includes(normalized)) return "ticketNumber";
  if (["тема", "topic", "subject"].includes(normalized)) return "topic";
  if (["датасоздания", "создана", "createdat", "created", "createddate"].includes(normalized)) return "createdAt";
  if (["slaplan", "slaplanned", "plan", "планsla"].includes(normalized)) return "slaPlan";
  if (["slafact", "slafactual", "fact", "фактsla"].includes(normalized)) return "slaFact";
  return null;
}

function isSupportHeaderRow(row: unknown[]): boolean {
  const keys = new Set(row.map(supportHeaderKey).filter(Boolean));
  const required: Array<NonNullable<ReturnType<typeof supportHeaderKey>>> = ["ticketNumber", "topic", "createdAt", "slaPlan", "slaFact"];
  return required.every((key) => keys.has(key));
}

function isSupport(rows: unknown[][]): boolean {
  return rows.some(isSupportHeaderRow);
}

function isTessa(rows: unknown[][]): boolean {
  const required = [
    "регномер",
    "юрлицо",
    "номердоговора",
    "типдокумента",
    "дата",
    "автор",
    "тема",
    "текстзадания",
    "ответственный",
    "срок",
    "новыйсрок",
    "датазавершения",
    "просрочка",
    "комментарий",
  ];

  return rowSets(rows).some((headers) => required.filter((item) => headers.has(item)).length >= 12);
}

function isPrint(rows: unknown[][]): boolean {
  const required = [
    "дата",
    "пользователь",
    "страниц",
    "копий",
    "принтер",
    "документ",
    "компьютер",
    "форматлиста",
    "драйвер",
    "высота",
    "ширина",
    "двусторонняяпечать",
    "чернобелый",
    "размерфайла",
  ];

  return rowSets(rows).some((headers) => required.filter((item) => headers.has(item)).length >= 11);
}

function isSsz(rows: unknown[][]): boolean {
  return rows.some((row) =>
    row.some((cell) => {
      const normalized = normalizeText(cell);
      return normalized.includes("сменно-суточное задание") || normalized.includes("сменно суточное задание");
    }),
  );
}

export async function detectReportType(file: File): Promise<ReportDetectionResult> {
  const rows = await readPreviewRows(file);
  const matchedTypes: DetectedReportType[] = [];

  if (isSupport(rows)) matchedTypes.push("support");
  if (isTessa(rows)) matchedTypes.push("tessa");
  if (isPrint(rows)) matchedTypes.push("print");
  if (isSsz(rows)) matchedTypes.push("ssz");

  if (matchedTypes.length === 0) return { type: "unknown", matchedTypes: [] };
  if (matchedTypes.length > 1) return { type: "ambiguous", matchedTypes };
  return { type: matchedTypes[0], matchedTypes };
}
