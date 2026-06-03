import type {
  DocumentType,
  PaperBucket,
  PrintBarDatum,
  PrintExcessSummary,
  PrintFilters,
  PrintJob,
  PrintKpis,
  PrintRawRecord,
  PrintTariffs,
  PrintUserAggregate,
  RiskReasonCode,
} from "../types";

export const PRINT_REQUIRED_COLUMNS = [
  "Дата",
  "Пользователь",
  "Страниц",
  "Копий",
  "Принтер",
  "Документ",
  "Компьютер",
  "Формат листа",
  "Драйвер",
  "Высота",
  "Ширина",
  "Двусторонняя печать",
  "Черно-белый",
  "Размер файла",
] as const;

export const PAPER_BUCKETS: PaperBucket[] = ["до A4 включительно", "A3", "от A2 и выше", "Не определено"];
export const DOC_TYPES: DocumentType[] = ["PDF", "Word", "Excel/табличный", "Outlook", "Изображение", "Другое", "Нет имени документа"];
export const PDF_PRINTER = "Microsoft Print to PDF";
export const EXCESS_CATEGORIES = ["Личные тематики", "Нормативные документы", "Служебные записки"];

export const RISK_REASON_OPTIONS: Array<{ value: RiskReasonCode; label: string }> = [
  { value: "big-job", label: "Задание от 100 стр." },
  { value: "no-duplex", label: "Многостраничная без двусторонней печати" },
  { value: "color", label: "Цветная печать" },
  { value: "excess-personal", label: "Личные тематики" },
  { value: "excess-regulatory", label: "Нормативные документы" },
  { value: "excess-service-note", label: "Служебные записки" },
];

export const DEFAULT_TARIFFS: PrintTariffs = {
  bwRate: 1,
  colorRate: 5,
  simplexRate: 1,
  duplexRate: 0.85,
};

export const DEFAULT_TABLE_LIMITS = {
  users: 10,
  risk: 10,
};

const DEFAULT_PAPER_BUCKETS: PaperBucket[] = ["до A4 включительно", "Не определено"];

const EXCESS_KEYWORDS: Array<{ category: string; label: string; pattern: RegExp }> = [
  { category: "Личные тематики", label: "книги", pattern: /учебник|пособи[ея]|повесть|рассказ|\.fb2\b|\.epub\b|\.djvu\b/iu },
  {
    category: "Личные тематики",
    label: "учебные работы",
    pattern:
      /реферат|курсов(ая|ой|ик)|диплом|дипломная|(?:^|[^а-яёa-z0-9])вкр(?:$|[^а-яёa-z0-9])|контрольная|лабораторная|эссе|практическая работа/iu,
  },
  {
    category: "Личные тематики",
    label: "праздники",
    pattern:
      /пасха|нов(?:ый|ого)\s+год|новогодн|рождество|8\s*марта|23\s*февраля|день\s+рождения|юбилей|поздравлен|открытк|валентинк|свадьб/iu,
  },
  { category: "Личные тематики", label: "хобби и быт", pattern: /рецепт|меню|вязани|выкройк|путеводител/iu },
  {
    category: "Личные тематики",
    label: "детские/школьные материалы",
    pattern: /раскраск|пропис[ьи]|домашн(?:ее|яя)\s+задани|детск(?:ий|ого|ом)?\s+сад|садик|школ[ауыое]?|олимпиад|егэ|огэ/iu,
  },
  { category: "Нормативные документы", label: "ГОСТ", pattern: /(?:^|[^а-яёa-z0-9])гост(?:\s*р)?(?:$|[^а-яёa-z0-9])/iu },
  { category: "Нормативные документы", label: "СНиП", pattern: /снип/iu },
  { category: "Нормативные документы", label: "СП", pattern: /(?:^|[^а-яёa-z0-9])сп\s*\d+(?:\.\d+)?/iu },
  { category: "Нормативные документы", label: "СанПиН", pattern: /санпин/iu },
  { category: "Нормативные документы", label: "ФНП", pattern: /(?:^|[^а-яёa-z0-9])фнп(?:$|[^а-яёa-z0-9])/iu },
  { category: "Нормативные документы", label: "РД", pattern: /(?:^|[^а-яёa-z0-9])рд\s*\d+/iu },
  { category: "Нормативные документы", label: "ПБ", pattern: /(?:^|[^а-яёa-z0-9])пб\s*\d+/iu },
  { category: "Нормативные документы", label: "НПБ", pattern: /(?:^|[^а-яёa-z0-9])нпб(?:$|[^а-яёa-z0-9])/iu },
  { category: "Нормативные документы", label: "ТР ТС", pattern: /тр\s*тс|техническ(?:ий|ого)\s+регламент/iu },
  { category: "Нормативные документы", label: "ISO/IEC", pattern: /(?:^|[^a-zа-яё0-9])(?:iso|iec)\s*\d*/iu },
  { category: "Нормативные документы", label: "стандарты", pattern: /стандарт|норматив|правила безопасности/iu },
  {
    category: "Служебные записки",
    label: "служебная записка",
    pattern: /служебн(?:ая|ой|ую|ые|ых|ым|ыми)?\s+записк|служебн(?:ая|ой|ую|ые|ых|ым|ыми)?\s+запис|служебка|сл\.?\s*записк|служ\.?\s*записк/iu,
  },
];

export function normalizeHeaderCell(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

export function missingRequiredColumns(record: PrintRawRecord | null): string[] {
  if (!record) return [...PRINT_REQUIRED_COLUMNS];
  const headers = new Set(Object.keys(record).map(normalizeHeaderCell));
  return PRINT_REQUIRED_COLUMNS.filter((column) => !headers.has(normalizeHeaderCell(column)));
}

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKey(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: Date | null): string {
  if (!value) return "";
  return value.toLocaleDateString("ru-RU");
}

export function formatDateTime(value: Date | null): string {
  if (!value) return "";
  return `${formatDate(value)} ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function formatShortDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

export function classifyDocType(documentName: unknown): DocumentType {
  const name = String(documentName || "").trim();
  const lower = name.toLowerCase();
  if (!name) return "Нет имени документа";
  if (/\.pdf\b/.test(lower)) return "PDF";
  if (/\.(doc|docx|rtf)\b/.test(lower) || lower.includes("microsoft word")) return "Word";
  if (/\.(xls|xlsx|xlsm)\b/.test(lower) || lower.includes("табличный документ")) return "Excel/табличный";
  if (lower.includes("outlook")) return "Outlook";
  if (/\.(jpg|jpeg|png|tif|tiff|bmp)\b/.test(lower)) return "Изображение";
  return "Другое";
}

function parseMm(value: unknown): number {
  const match = String(value || "").match(/([0-9]+(?:[\.,][0-9]+)?)/);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

export function classifyPaperFormat(row: PrintRawRecord): PaperBucket {
  const format = String(row["Формат листа"] || "").trim().toUpperCase();
  if (["A2", "A1", "A0"].includes(format)) return "от A2 и выше";
  if (format === "A3") return "A3";
  if (["A4", "A5", "A6", "LETTER", "STATEMENT"].includes(format)) return "до A4 включительно";

  const height = parseMm(row["Высота"]);
  const width = parseMm(row["Ширина"]);
  if (height && width) {
    const longSide = Math.max(height, width);
    const shortSide = Math.min(height, width);
    const area = height * width;
    if (longSide <= 297 && shortSide <= 210) return "до A4 включительно";
    if (longSide <= 420 && shortSide <= 297) return "A3";
    if (longSide >= 594 || shortSide >= 420 || area >= 594 * 420) return "от A2 и выше";
    return "A3";
  }

  if (["LEGAL", "B4", "C4", "8.5X13"].includes(format)) return "A3";
  return "Не определено";
}

export function classifyExcessPrint(documentName: unknown): Array<{ category: string; label: string }> {
  const name = String(documentName || "");
  const seen = new Set<string>();
  const matches: Array<{ category: string; label: string }> = [];

  EXCESS_KEYWORDS.forEach((keyword) => {
    if (!keyword.pattern.test(name)) return;
    const key = `${keyword.category}:${keyword.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push({ category: keyword.category, label: keyword.label });
  });

  return matches;
}

export function normalizePrintRow(row: PrintRawRecord): PrintJob {
  const pages = Math.max(0, Math.trunc(parseNumber(row["Страниц"])));
  const copies = Math.max(0, Math.trunc(parseNumber(row["Копий"]))) || 1;
  const totalPages = pages * copies;
  const date = parseDate(row["Дата"]);
  const paperBucket = classifyPaperFormat(row);
  const docType = classifyDocType(row["Документ"]);
  const isBigJob = totalPages >= 100;
  const isMultiNoDuplex = pages >= 2 && row["Двусторонняя печать"] === "NOT DUPLEX";
  const isColor = row["Черно-белый"] === "NOT GRAYSCALE";
  const isPdfPrinter = row["Принтер"] === PDF_PRINTER;
  const excessMatches = classifyExcessPrint(row["Документ"] || "");
  const excessCategories = Array.from(new Set(excessMatches.map((match) => match.category)));
  const riskReasons: PrintJob["riskReasons"] = [];
  const riskReasonCodes: RiskReasonCode[] = [];
  let riskScore = 0;

  if (isBigJob) {
    riskScore += 35;
    riskReasons.push({ code: "big-job", label: "от 100 стр.", kind: "danger" });
    riskReasonCodes.push("big-job");
  }
  if (isMultiNoDuplex) {
    riskScore += 35;
    riskReasons.push({ code: "no-duplex", label: "без двусторонней", kind: "warning" });
    riskReasonCodes.push("no-duplex");
  }
  if (isColor) {
    riskScore += 20;
    riskReasons.push({ code: "color", label: "цветная", kind: "primary" });
    riskReasonCodes.push("color");
  }
  if (excessCategories.includes("Личные тематики")) {
    riskScore += 30;
    const words = excessMatches.filter((match) => match.category === "Личные тематики").map((match) => match.label).slice(0, 2).join(", ");
    riskReasons.push({ code: "excess-personal", label: `избыточная: личные${words ? ` (${words})` : ""}`, kind: "primary" });
    riskReasonCodes.push("excess-personal");
  }
  if (excessCategories.includes("Нормативные документы")) {
    riskScore += 20;
    const words = excessMatches.filter((match) => match.category === "Нормативные документы").map((match) => match.label).slice(0, 2).join(", ");
    riskReasons.push({ code: "excess-regulatory", label: `избыточная: нормативные${words ? ` (${words})` : ""}`, kind: "primary" });
    riskReasonCodes.push("excess-regulatory");
  }
  if (excessCategories.includes("Служебные записки")) {
    riskScore += 25;
    riskReasons.push({ code: "excess-service-note", label: "избыточная: служебные записки", kind: "success" });
    riskReasonCodes.push("excess-service-note");
  }

  return {
    date,
    dateKey: dateKey(date),
    user: row["Пользователь"] || "Не указан",
    pages,
    copies,
    totalPages,
    printer: row["Принтер"] || "",
    documentName: row["Документ"] || "Нет имени документа",
    computer: row["Компьютер"] || "Не указан",
    driver: row["Драйвер"] || "",
    duplex: row["Двусторонняя печать"] || "",
    color: row["Черно-белый"] || "",
    paperBucket,
    docType,
    isBigJob,
    isMultiNoDuplex,
    isColor,
    isPdfPrinter,
    isExcessPrint: excessMatches.length > 0,
    excessCategories,
    excessMatches,
    riskScore: Math.min(100, riskScore),
    riskReasons,
    riskReasonCodes,
    raw: row,
  };
}

export function initialPrintFilters(rows: PrintJob[]): PrintFilters {
  const dates = rows.map((row) => row.dateKey).filter(Boolean).sort();
  return {
    dateFrom: dates[0] || "",
    dateTo: dates[dates.length - 1] || "",
    user: "",
    computer: "",
    documentText: "",
    docType: "",
    color: "",
    duplex: "",
    paperBuckets: [...DEFAULT_PAPER_BUCKETS],
    riskReason: "",
    excludePdfPrinter: true,
  };
}

export function buildPrintFilterOptions(rows: PrintJob[]) {
  return {
    users: uniqueSorted(rows.map((row) => row.user)),
    computers: uniqueSorted(rows.map((row) => row.computer)),
    docTypes: DOC_TYPES.filter((type) => rows.some((row) => row.docType === type)),
  };
}

export function estimateRowCost(row: PrintJob, tariffs: PrintTariffs): number {
  const colorRate = row.isColor ? tariffs.colorRate : tariffs.bwRate;
  const duplexRate = row.duplex === "DUPLEX" ? tariffs.duplexRate : tariffs.simplexRate;
  return row.totalPages * colorRate * duplexRate;
}

export function applyPrintFilters(rows: PrintJob[], filters: PrintFilters): PrintJob[] {
  const userQuery = filters.user.toLowerCase();
  const computerQuery = filters.computer.toLowerCase();
  const docQuery = filters.documentText.toLowerCase();

  return rows.filter((row) => {
    if (filters.excludePdfPrinter && row.isPdfPrinter) return false;
    if (filters.dateFrom && row.dateKey < filters.dateFrom) return false;
    if (filters.dateTo && row.dateKey > filters.dateTo) return false;
    if (userQuery && !row.user.toLowerCase().includes(userQuery)) return false;
    if (computerQuery && !row.computer.toLowerCase().includes(computerQuery)) return false;
    if (docQuery && !row.documentName.toLowerCase().includes(docQuery)) return false;
    if (filters.docType && row.docType !== filters.docType) return false;
    if (filters.color && row.color !== filters.color) return false;
    if (filters.duplex && row.duplex !== filters.duplex) return false;
    if (filters.paperBuckets.length > 0 && !filters.paperBuckets.includes(row.paperBucket)) return false;
    if (filters.riskReason && !row.riskReasonCodes.includes(filters.riskReason as RiskReasonCode)) return false;
    return true;
  });
}

export function calculatePrintKpis(rows: PrintJob[], tariffs: PrintTariffs): PrintKpis {
  const totalPages = sum(rows, (row) => row.totalPages);
  const simplexPages = sum(rows.filter((row) => row.duplex === "NOT DUPLEX"), (row) => row.totalPages);
  const colorPages = sum(rows.filter((row) => row.isColor), (row) => row.totalPages);
  const bigRows = rows.filter((row) => row.isBigJob);

  return {
    totalPages,
    totalJobs: rows.length,
    simplexPages,
    simplexRatio: totalPages ? (simplexPages / totalPages) * 100 : 0,
    colorPages,
    colorRatio: totalPages ? (colorPages / totalPages) * 100 : 0,
    bigJobs: bigRows.length,
    bigPages: sum(bigRows, (row) => row.totalPages),
    usersCount: new Set(rows.map((row) => row.user)).size,
    estimatedCost: rows.reduce((total, row) => total + estimateRowCost(row, tariffs), 0),
  };
}

export function buildTopUsers(rows: PrintJob[], tariffs: PrintTariffs, sort: keyof PrintUserAggregate, limit: number): PrintUserAggregate[] {
  const map = new Map<string, PrintUserAggregate>();
  rows.forEach((row) => {
    const item = map.get(row.user) ?? { user: row.user, pages: 0, cost: 0, noDuplexPages: 0, colorPages: 0, bigJobs: 0 };
    item.pages += row.totalPages;
    item.cost += estimateRowCost(row, tariffs);
    if (row.isMultiNoDuplex) item.noDuplexPages += row.totalPages;
    if (row.isColor) item.colorPages += row.totalPages;
    if (row.isBigJob) item.bigJobs += 1;
    map.set(row.user, item);
  });

  return Array.from(map.values())
    .sort((a, b) => {
      const left = typeof a[sort] === "number" ? a[sort] : 0;
      const right = typeof b[sort] === "number" ? b[sort] : 0;
      return right - left || b.pages - a.pages;
    })
    .slice(0, limit);
}

export function calculatePrintAnalytics(rows: PrintJob[]): {
  paperBars: PrintBarDatum[];
  docTypeBars: PrintBarDatum[];
  excessSummary: PrintExcessSummary;
} {
  const paperPages = new Map<PaperBucket, number>(PAPER_BUCKETS.map((bucket) => [bucket, 0]));
  const docTypePages = new Map<DocumentType, number>(DOC_TYPES.map((type) => [type, 0]));
  const excessCategoryStats = new Map<string, { pages: number; jobs: number }>(EXCESS_CATEGORIES.map((category) => [category, { pages: 0, jobs: 0 }]));
  const excessUsers = new Set<string>();
  let excessJobs = 0;
  let excessPages = 0;

  rows.forEach((row) => {
    paperPages.set(row.paperBucket, (paperPages.get(row.paperBucket) ?? 0) + row.totalPages);
    docTypePages.set(row.docType, (docTypePages.get(row.docType) ?? 0) + row.totalPages);

    if (!row.isExcessPrint) return;
    excessJobs += 1;
    excessPages += row.totalPages;
    excessUsers.add(row.user);

    EXCESS_CATEGORIES.forEach((category) => {
      if (!row.excessCategories.includes(category)) return;
      const stats = excessCategoryStats.get(category);
      if (!stats) return;
      stats.pages += row.totalPages;
      stats.jobs += 1;
    });
  });

  return {
    paperBars: PAPER_BUCKETS.map((bucket) => ({
      label: bucket,
      pages: paperPages.get(bucket) ?? 0,
    })),
    docTypeBars: DOC_TYPES.map((type) => ({
      label: type,
      pages: docTypePages.get(type) ?? 0,
    })).filter((item) => item.pages > 0),
    excessSummary: {
      jobs: excessJobs,
      pages: excessPages,
      users: excessUsers.size,
      categories: EXCESS_CATEGORIES.map((category) => {
        const stats = excessCategoryStats.get(category) ?? { pages: 0, jobs: 0 };
        return {
          label: category,
          pages: stats.pages,
          jobs: stats.jobs,
        };
      }),
    },
  };
}

export function buildPaperBars(rows: PrintJob[]): PrintBarDatum[] {
  return calculatePrintAnalytics(rows).paperBars;
}

export function buildDocTypeBars(rows: PrintJob[]): PrintBarDatum[] {
  return calculatePrintAnalytics(rows).docTypeBars;
}

export function buildExcessSummary(rows: PrintJob[]): PrintExcessSummary {
  return calculatePrintAnalytics(rows).excessSummary;
}

export function buildRiskJobs(rows: PrintJob[], sort: "riskScore" | "totalPages", limit: number): PrintJob[] {
  return rows
    .filter((row) => row.riskScore > 0)
    .sort((a, b) => {
      if (sort === "totalPages") return b.totalPages - a.totalPages || b.riskScore - a.riskScore;
      return b.riskScore - a.riskScore || b.totalPages - a.totalPages;
    })
    .slice(0, limit);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
}

function sum<T>(items: T[], select: (item: T) => number): number {
  return items.reduce((total, item) => total + (select(item) || 0), 0);
}
