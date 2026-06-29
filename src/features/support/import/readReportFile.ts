import { classifySupportTopic } from "../logic/supportClassifier";
import { SUPPORT_MAX_PARSE_ROWS, SUPPORT_OVERDUE_BUCKETS, SUPPORT_PLAN_BUCKETS, SUPPORT_REQUIRED_COLUMNS } from "../supportConfig";
import type {
  SupportImportResult,
  SupportOverdueBucket,
  SupportPlanBucket,
  SupportRawRecord,
  SupportReportFormat,
  SupportSlaStatus,
  SupportSourceSlaStatus,
  SupportTicket,
} from "../supportTypes";
import { readFileArrayBuffer, readFileText } from "../../../shared/fileReadCache";

type HeaderMap = Partial<Record<keyof SupportRawRecord, number>>;

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\s_\-./\\]+/g, "")
    .replace(/номерзаявки/g, "№")
    .replace(/номер/g, "№");
}

function headerKey(value: string): keyof SupportRawRecord | null {
  const normalized = normalizeHeader(value);
  if (["№", "n", "no", "id", "ticketid", "ticketnumber", "заявка"].includes(normalized)) return "ticketNumber";
  if (["тема", "topic", "subject"].includes(normalized)) return "topic";
  if (["датасоздания", "создана", "createdat", "created", "createddate"].includes(normalized)) return "createdAtRaw";
  if (["slaplan", "slaplanned", "plan", "планsla"].includes(normalized)) return "slaPlanRaw";
  if (["slafact", "slafactual", "fact", "фактsla"].includes(normalized)) return "slaFactRaw";
  if (["slaworktime", "worktime", "рабочеевремяsla", "чистоевремяsla"].includes(normalized)) return "slaWorkTimeRaw";
  if (["приоритет", "priority"].includes(normalized)) return "priorityRaw";
  if (["выполнениеsla", "статусsla", "slaresolution", "slastatus"].includes(normalized)) return "sourceSlaStatusRaw";
  if (["fulltime", "общевремя", "полноевремя"].includes(normalized)) return "fullTimeRaw";
  return null;
}

function missingColumns(map: HeaderMap) {
  const missing: string[] = [];
  if (map.ticketNumber === undefined) missing.push("№");
  if (map.topic === undefined) missing.push("Тема");
  if (map.createdAtRaw === undefined) missing.push("Дата создания");
  if (map.slaPlanRaw === undefined) missing.push("SLA_plan");
  if (map.slaFactRaw === undefined) missing.push("SLA_fact");
  return missing;
}

function buildHeaderMap(row: unknown[]): HeaderMap {
  const map: HeaderMap = {};
  row.forEach((cell, index) => {
    const key = headerKey(String(cell ?? ""));
    if (!key || map[key] !== undefined) return;
    map[key] = index;
  });
  return map;
}

function findHeaderRow(rows: unknown[][]) {
  let best = { index: -1, map: {} as HeaderMap, score: 0 };
  rows.forEach((row, index) => {
    const map = buildHeaderMap(row);
    const score = 5 - missingColumns(map).length;
    if (score > best.score) best = { index, map, score };
  });
  return best;
}

function excelSerialToDate(value: number): Date | null {
  if (!Number.isFinite(value)) return null;
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = value - Math.floor(value);
  const totalSeconds = Math.round(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

export function parseSupportDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "number") return excelSerialToDate(value);

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const numeric = Number(raw.replace(",", "."));
  if (Number.isFinite(numeric) && numeric > 20_000 && numeric < 80_000) return excelSerialToDate(numeric);

  const normalized = raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ");
  const match = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const rawYear = Number(match[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const hours = Number(match[4] ?? "0");
    const minutes = Number(match[5] ?? "0");
    const seconds = Number(match[6] ?? "0");
    const date = new Date(year, month, day, hours, minutes, seconds, 0);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) return date;
  }

  const fallback = new Date(normalized);
  return Number.isFinite(fallback.getTime()) ? fallback : null;
}

function hoursBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 10) / 10;
}

function nullLike(value: unknown): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "" || raw === "null" || raw === "(null)";
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDurationHours(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return roundHours(value * 24);
  if (nullLike(value)) return null;

  const raw = String(value ?? "").trim().replace(",", ".");
  const timeMatch = raw.match(/^(-)?(\d{1,4}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const sign = timeMatch[1] ? -1 : 1;
    const hours = Number(timeMatch[2]);
    const minutes = Number(timeMatch[3]);
    const seconds = Number(timeMatch[4] ?? "0");
    return roundHours(sign * (hours + minutes / 60 + seconds / 3600));
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? roundHours(numeric) : null;
}

function normalizeSourceSlaStatus(value: unknown): SupportSourceSlaStatus | null {
  if (nullLike(value)) return null;
  const normalized = String(value).trim().toLowerCase().replace(/ё/g, "е");
  if (normalized.includes("в работе")) return "В работе";
  if (normalized.includes("превыш")) return "Превышен";
  if (normalized.includes("выполн")) return "Выполнен";
  return null;
}

function slaStatusFromSource(sourceSlaStatus: SupportSourceSlaStatus | null, slaPlan: Date | null, slaFact: Date | null): SupportSlaStatus {
  if (sourceSlaStatus === "В работе") return "В работе";
  if (sourceSlaStatus === "Превышен") return "Нарушен SLA";
  if (sourceSlaStatus === "Выполнен") return "В SLA";
  return slaStatus(slaPlan, slaFact);
}

function parsePriority(value: unknown): { label: string | null; level: number | null; hours: number | null } {
  if (nullLike(value)) return { label: null, level: null, hours: null };
  const label = String(value).trim();
  const normalized = label.toLowerCase().replace(",", ".").replace(/ё/g, "е");
  const levelMatch = normalized.match(/приоритет\s*(\d+)/);
  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ч|час)/);
  return {
    label,
    level: levelMatch ? Number(levelMatch[1]) : null,
    hours: hoursMatch ? Number(hoursMatch[1]) : null,
  };
}

function planBucket(planHours: number | null): SupportPlanBucket | null {
  if (planHours === null) return null;
  return SUPPORT_PLAN_BUCKETS.find((bucket) => planHours <= bucket.maxHours)?.value ?? "4+ дня";
}

function overdueBucket(overdueHours: number): SupportOverdueBucket {
  return SUPPORT_OVERDUE_BUCKETS.find((bucket) => overdueHours <= bucket.maxHours)?.value ?? "3+ дня";
}

function slaStatus(slaPlan: Date | null, slaFact: Date | null): SupportSlaStatus {
  if (!slaPlan) return "Нет SLA_plan";
  if (!slaFact) return "Нет SLA_fact";
  return slaFact.getTime() <= slaPlan.getTime() ? "В SLA" : "Нарушен SLA";
}

function normalizeTicket(record: SupportRawRecord, index: number, format: SupportReportFormat): SupportTicket {
  const createdAt = parseSupportDate(record.createdAtRaw);
  const slaPlan = parseSupportDate(record.slaPlanRaw);
  const slaFact = parseSupportDate(record.slaFactRaw);
  const sourceSlaStatus = normalizeSourceSlaStatus(record.sourceSlaStatusRaw);
  const status = slaStatusFromSource(sourceSlaStatus, slaPlan, slaFact);
  const planHours = hoursBetween(createdAt, slaPlan);
  const calendarResolutionHours = hoursBetween(createdAt, slaFact);
  const fullTimeHours = calendarResolutionHours;
  const slaWorkHours = parseDurationHours(record.slaWorkTimeRaw);
  const priority = parsePriority(record.priorityRaw);
  const rawOverdueHours = hoursBetween(slaPlan, slaFact);
  const rawReserveHours = hoursBetween(slaFact, slaPlan);
  const calendarOverdueHours = Math.max(0, rawOverdueHours ?? 0);
  const workOverdueHours = slaWorkHours !== null && priority.hours !== null ? Math.max(0, roundHours(slaWorkHours - priority.hours)) : null;
  const overdueHours = status === "Нарушен SLA" ? (workOverdueHours ?? calendarOverdueHours) : 0;
  const reserveHours = Math.max(0, rawReserveHours ?? 0);
  const waitingHours = calendarResolutionHours !== null && slaWorkHours !== null ? Math.max(0, roundHours(calendarResolutionHours - slaWorkHours)) : null;

  return {
    id: `support-${index}-${String(record.ticketNumber ?? "").trim()}`,
    format,
    ticketNumber: String(record.ticketNumber ?? "").trim() || `строка ${index + 1}`,
    topic: String(record.topic ?? "").trim() || "Без темы",
    createdAt,
    slaPlan,
    slaFact,
    sourceSlaStatus,
    category: classifySupportTopic(String(record.topic ?? "")),
    slaApplicable: status === "В SLA" || status === "Нарушен SLA",
    slaStatus: status,
    calendarResolutionHours,
    resolutionHours: fullTimeHours,
    fullTimeHours,
    slaWorkHours,
    waitingHours,
    planHours,
    priorityLabel: priority.label,
    priorityLevel: priority.level,
    priorityHours: priority.hours,
    workOverdueHours,
    calendarOverdueHours,
    overdueHours,
    reserveHours,
    planBucket: planBucket(priority.hours ?? planHours),
    overdueBucket: overdueBucket(overdueHours),
    sourceRow: index + 1,
  };
}

function rowsToRecords(rows: unknown[][]): { records: SupportRawRecord[]; missingRequiredColumns: string[]; format: SupportReportFormat } {
  const header = findHeaderRow(rows);
  const missingRequiredColumns = missingColumns(header.map);
  const hasWorktimeColumns =
    header.map.slaWorkTimeRaw !== undefined ||
    header.map.priorityRaw !== undefined ||
    header.map.sourceSlaStatusRaw !== undefined ||
    header.map.fullTimeRaw !== undefined;
  const format: SupportReportFormat = hasWorktimeColumns ? "worktime" : "legacy";
  if (header.index < 0 || missingRequiredColumns.length > 0) return { records: [], missingRequiredColumns, format };

  const records = rows.slice(header.index + 1).flatMap((row) => {
    if (!row.some((cell) => String(cell ?? "").trim().length > 0)) return [];
    const ticketNumber = String(row[header.map.ticketNumber ?? -1] ?? "").trim();
    const topic = String(row[header.map.topic ?? -1] ?? "").trim();
    if (!ticketNumber && !topic) return [];

    return [{
      ticketNumber,
      topic,
      createdAtRaw: row[header.map.createdAtRaw ?? -1] ?? "",
      slaPlanRaw: row[header.map.slaPlanRaw ?? -1] ?? "",
      slaFactRaw: row[header.map.slaFactRaw ?? -1] ?? "",
      slaWorkTimeRaw: header.map.slaWorkTimeRaw !== undefined ? row[header.map.slaWorkTimeRaw] : "",
      priorityRaw: header.map.priorityRaw !== undefined ? row[header.map.priorityRaw] : "",
      sourceSlaStatusRaw: header.map.sourceSlaStatusRaw !== undefined ? row[header.map.sourceSlaStatusRaw] : "",
      fullTimeRaw: header.map.fullTimeRaw !== undefined ? row[header.map.fullTimeRaw] : "",
    }];
  });

  return { records, missingRequiredColumns, format };
}

function detectCsvDelimiter(line: string) {
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  return semicolonCount >= commaCount ? ";" : ",";
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
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  return rows;
}

async function readRows(file: File): Promise<unknown[][]> {
  const fallbackToText = async () => {
    const text = (await readFileText(file)).replace(/^\uFEFF/, "");
    const firstLine = text.replace(/\r/g, "").split("\n").find((line) => line.trim().length > 0) ?? "";
    return parseDelimitedRows(text, detectCsvDelimiter(firstLine));
  };

  if (file.name.toLowerCase().endsWith(".csv")) {
    return fallbackToText();
  }

  const XLSX = await import("xlsx");
  let workbook;
  try {
    workbook = XLSX.read(await readFileArrayBuffer(file), { type: "array", cellDates: true, sheetRows: SUPPORT_MAX_PARSE_ROWS });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid HTML")) {
      console.warn("XLSX parsing failed with HTML error, falling back to raw text parsing for", file.name);
      return fallbackToText();
    }
    throw err;
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  const cellRefs = Object.keys(worksheet).filter((key) => !key.startsWith("!"));
  if (cellRefs.length === 0) return [];

  const bounds = cellRefs.reduce(
    (current, ref) => {
      const cell = XLSX.utils.decode_cell(ref);
      return {
        minRow: Math.min(current.minRow, cell.r),
        maxRow: Math.max(current.maxRow, cell.r),
        minCol: Math.min(current.minCol, cell.c),
        maxCol: Math.max(current.maxCol, cell.c),
      };
    },
    { minRow: Number.POSITIVE_INFINITY, maxRow: 0, minCol: Number.POSITIVE_INFINITY, maxCol: 0 },
  );

  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: "",
    range: {
      s: { r: bounds.minRow, c: bounds.minCol },
      e: { r: bounds.maxRow, c: bounds.maxCol },
    },
  });
}

export async function readSupportReportFile(file: File): Promise<SupportImportResult> {
  const rows = await readRows(file);
  const { records, missingRequiredColumns, format } = rowsToRecords(rows);
  const tickets = records.map((record, index) => normalizeTicket(record, index, format));

  return {
    format,
    rawRecords: records,
    tickets: missingRequiredColumns.length === 0 ? tickets : [],
    file: {
      fileName: file.name,
      loadedAt: new Date().toISOString(),
    },
    quality: {
      missingRequiredColumns: missingRequiredColumns.length > 0 ? missingRequiredColumns : SUPPORT_REQUIRED_COLUMNS.filter(() => false),
      rows: records.length,
      invalidCreatedAt: tickets.filter((ticket) => !ticket.createdAt).length,
      invalidSlaPlan: tickets.filter((ticket) => ticket.slaPlan === null && String(records[ticket.sourceRow - 1]?.slaPlanRaw ?? "").trim().length > 0).length,
      invalidSlaFact: tickets.filter((ticket) => ticket.slaStatus !== "В работе" && ticket.slaFact === null && !nullLike(records[ticket.sourceRow - 1]?.slaFactRaw)).length,
    },
  };
}
