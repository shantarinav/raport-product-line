export type FocusMode = "stuck" | "riskToday" | "allOpen";
export type DeadlineMode = "all" | "over30" | "days8to30" | "days1to7" | "today" | "week";

export type AgreementFilters = {
  focusMode: FocusMode;
  deadlineMode: DeadlineMode;
  documentType: string;
  contractNumber: string;
  subject: string;
  responsible: string;
  author: string;
  legalEntity: string;
};

export type FilterDimension = Exclude<keyof AgreementFilters, "focusMode" | "deadlineMode">;

export type NormalizedRecord = {
  id: string;
  process: "Согласование" | "Исполнение";
  regNumber: string;
  legalEntity: string;
  contractNumber: string;
  documentType: string;
  documentDate: Date | null;
  author: string;
  subject: string;
  taskText: string;
  responsible: string;
  deadline: Date | null;
  newDeadline: Date | null;
  completionDate: Date | null;
  rawOverdue: string;
  overdueDays: number;
  status: "В срок" | "Завершено с просрочкой" | "Открыто с просрочкой" | "Открыто в работе";
  isOverdue: boolean;
  isOpen: boolean;
  comment: string;
  sourceFileName: string;
};

export type QualitySummary = {
  sourceFileName: string;
  process: "Согласование" | "Исполнение";
  rows: number;
  missingRequiredColumns: string[];
  invalidDocumentDates: number;
  invalidDeadlines: number;
  invalidNewDeadlines: number;
  invalidCompletionDates: number;
  openRowsWithoutDeadline: number;
  duplicateRows: number;
};

export type TessaImportResult = {
  records: NormalizedRecord[];
  quality: QualitySummary;
};

export type LoadedFile = {
  fileName: string;
  loadedAt: Date;
  rows: number;
  duplicateRows: number;
};

export type AgreementFact = {
  record: NormalizedRecord;
  isOpen: boolean;
  isStuck: boolean;
  isRiskToday: boolean;
  isRiskWeek: boolean;
  stuckDays: number;
  daysToDeadline: number | null;
  problemRating: number;
  problemStuckCount: number;
  problemMaxStuckDays: number;
  problemHasRiskToday: boolean;
};

export type DocumentProblem = {
  key: string;
  contractNumber: string;
  rootContractNumber: string;
  regNumber: string;
  documentType: string;
  subject: string;
  authors: string;
  responsibles: string;
  records: NormalizedRecord[];
  stuckCount: number;
  riskTodayCount: number;
  maxStuckDays: number;
  rating: number;
};

export type AttentionPerson = {
  name: string;
  open: number;
  stuck: number;
  riskToday: number;
  maxStuckDays: number;
  attentionScore: number;
  stuckRate: number;
};

export type AgreementKpis = {
  open: number;
  stuck: number;
  riskToday: number;
  riskWeek: number;
  criticalOver30: number;
  maxStuckDays: number;
  stuckRate: number;
  attentionPeople: number;
};
