export type CellValue = string | number | boolean | Date | null | undefined;

export interface ReportPeriod {
  start: string | null;
  end: string | null;
  label: string;
}

export interface ImportWarning {
  rowNumber: number;
  message: string;
}

export interface OperationRecord {
  id: string;
  sourceName: string;
  rowNumber: number;
  sszNumber: string;
  sszDate: string | null;
  department: string;
  master: string;
  status: string;
  product: string;
  kit: string;
  semiProduct: string;
  operation: string;
  executor: string;
  technologyTime: number;
  noTechnologyTime: number;
}

export interface SszRecord {
  id: string;
  sourceName: string;
  number: string;
  date: string | null;
  department: string;
  master: string;
  status: string;
  technologyTime: number;
  noTechnologyTime: number;
  operations: OperationRecord[];
}

export interface ImportedReport {
  sourceId: string;
  sourceName: string;
  importedAt: string;
  period: ReportPeriod;
  statuses: string[];
  sszRecords: SszRecord[];
  operationRows: OperationRecord[];
  warnings: ImportWarning[];
  errors: string[];
}
