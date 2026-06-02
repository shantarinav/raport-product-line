export type ProcessType = 'Согласование' | 'Исполнение';

export type ProcessFilter = 'Все' | ProcessType;

export type TaskStatus =
  | 'В срок'
  | 'Завершено с просрочкой'
  | 'Открыто с просрочкой'
  | 'Открыто в работе';

export type QuickPreset =
  | 'all'
  | 'open'
  | 'openOverdue'
  | 'completedOverdue'
  | 'multiProblemDocs';

export type NormalizedRecord = {
  id: string;
  process: ProcessType;
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
  status: TaskStatus;
  isOverdue: boolean;
  isOpen: boolean;
  month: string | null;
  deadlineMonth: string | null;
  comment: string;
  sourceFileName: string;
};

export type QualitySummary = {
  sourceFileName: string;
  process: ProcessType;
  rows: number;
  missingRequiredColumns: string[];
  invalidDocumentDates: number;
  invalidDeadlines: number;
  invalidNewDeadlines: number;
  invalidCompletionDates: number;
  openRowsWithoutDeadline: number;
  duplicateRows: number;
};

export type ImportResult = {
  records: NormalizedRecord[];
  quality: QualitySummary;
};

export type Filters = {
  process: ProcessFilter;
  documentDateFrom: string;
  documentDateTo: string;
  deadlineFrom: string;
  deadlineTo: string;
  documentType: string;
  author: string;
  responsible: string;
  status: string;
  legalEntity: string;
  search: string;
  quickPreset: QuickPreset;
};

export type KpiMetrics = {
  total: number;
  onTime: number;
  overdue: number;
  open: number;
  openOverdue: number;
  averageOverdueDays: number;
  maxOverdueDays: number;
  onTimeRate: number;
};

export type PersonMetric = {
  name: string;
  total: number;
  onTime: number;
  completedOverdue: number;
  openOverdue: number;
  overdueRate: number;
  averageOverdueDays: number;
  topDocumentTypes: string;
};

export type DocumentTypeMetric = {
  name: string;
  total: number;
  approval: number;
  execution: number;
  overdue: number;
  openOverdue: number;
  overdueRate: number;
};

export type DocumentProblemMetric = {
  regNumber: string;
  subject: string;
  documentType: string;
  totalProblems: number;
  openOverdue: number;
  maxOverdueDays: number;
};

export type MonthlyMetric = {
  month: string;
  total: number;
  onTimeRate: number;
};

export type StatusMetric = {
  status: TaskStatus;
  count: number;
};

export type ProcessStatusMetric = {
  status: TaskStatus;
  Согласование: number;
  Исполнение: number;
};
