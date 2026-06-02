export type PaperBucket = "до A4 включительно" | "A3" | "от A2 и выше" | "Не определено";

export type DocumentType = "PDF" | "Word" | "Excel/табличный" | "Outlook" | "Изображение" | "Другое" | "Нет имени документа";

export type RiskReasonCode =
  | "big-job"
  | "no-duplex"
  | "color"
  | "excess-personal"
  | "excess-regulatory"
  | "excess-service-note";

export type RiskReason = {
  code: RiskReasonCode;
  label: string;
  kind: "danger" | "warning" | "primary" | "success";
};

export type PrintRawRecord = Record<string, string>;

export type PrintJob = {
  date: Date | null;
  dateKey: string;
  user: string;
  pages: number;
  copies: number;
  totalPages: number;
  printer: string;
  documentName: string;
  computer: string;
  driver: string;
  duplex: string;
  color: string;
  paperBucket: PaperBucket;
  docType: DocumentType;
  isBigJob: boolean;
  isMultiNoDuplex: boolean;
  isColor: boolean;
  isPdfPrinter: boolean;
  isExcessPrint: boolean;
  excessCategories: string[];
  excessMatches: Array<{ category: string; label: string }>;
  riskScore: number;
  riskReasons: RiskReason[];
  riskReasonCodes: RiskReasonCode[];
  raw: PrintRawRecord;
};

export type PrintImportResult = {
  jobs: PrintJob[];
  rawRecords: PrintRawRecord[];
  file: LoadedPrintFile;
  quality: {
    missingRequiredColumns: string[];
  };
};

export type LoadedPrintFile = {
  fileName: string;
  loadedAt: string;
};

export type PrintFilters = {
  dateFrom: string;
  dateTo: string;
  user: string;
  computer: string;
  documentText: string;
  docType: string;
  color: string;
  duplex: string;
  paperBuckets: PaperBucket[];
  riskReason: string;
  excludePdfPrinter: boolean;
};

export type PrintTariffs = {
  bwRate: number;
  colorRate: number;
  simplexRate: number;
  duplexRate: number;
};

export type PrintKpis = {
  totalPages: number;
  totalJobs: number;
  simplexPages: number;
  simplexRatio: number;
  colorPages: number;
  colorRatio: number;
  bigJobs: number;
  bigPages: number;
  usersCount: number;
  estimatedCost: number;
};

export type PrintUserAggregate = {
  user: string;
  pages: number;
  cost: number;
  noDuplexPages: number;
  colorPages: number;
  bigJobs: number;
};

export type PrintBarDatum = {
  label: string;
  pages: number;
  jobs?: number;
};

export type PrintExcessSummary = {
  jobs: number;
  pages: number;
  users: number;
  categories: PrintBarDatum[];
};
