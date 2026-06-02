import Papa from 'papaparse';
import { format, isValid, parse } from 'date-fns';
import type { ImportResult, NormalizedRecord, ProcessType, QualitySummary, TaskStatus } from './types';

const REQUIRED_COLUMNS = [
  'Рег. номер',
  'Юр. лицо',
  'Номер договора',
  'Тип документа',
  'Дата',
  'Автор',
  'Тема',
  'Текст задания',
  'Ответственный',
  'Срок',
  'Новый срок',
  'Дата завершения',
  'Просрочка',
  'Комментарий',
];

const DATE_PATTERNS = ['dd.MM.yyyy HH:mm:ss', 'dd.MM.yyyy H:mm:ss', 'dd.MM.yyyy'];

type RawRow = Record<string, string | undefined>;

type DateField = 'documentDate' | 'deadline' | 'newDeadline' | 'completionDate';

type ParseDateResult = {
  date: Date | null;
  invalid: boolean;
};

export function parseCsvFile(file: File, process: ProcessType, analysisDate = new Date()): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
      complete: (result) => {
        if (result.errors.length > 0) {
          const fatal = result.errors.find((error) => error.type === 'Delimiter' || error.type === 'Quotes');
          if (fatal) {
            reject(new Error(`CSV не удалось прочитать: ${fatal.message}`));
            return;
          }
        }

        const normalizedHeaders = result.meta.fields?.map((field) => field.trim()) ?? [];
        const missingRequiredColumns = REQUIRED_COLUMNS.filter((column) => !normalizedHeaders.includes(column));
        const quality: QualitySummary = {
          sourceFileName: file.name,
          process,
          rows: result.data.length,
          missingRequiredColumns,
          invalidDocumentDates: 0,
          invalidDeadlines: 0,
          invalidNewDeadlines: 0,
          invalidCompletionDates: 0,
          openRowsWithoutDeadline: 0,
          duplicateRows: 0,
        };

        const records = deduplicateRecords(result.data.map((row, index) => normalizeRow(row, index, file.name, process, analysisDate, quality)), quality);
        resolve({ records, quality });
      },
      error: (error) => reject(error),
    });
  });
}

function normalizeRow(
  row: RawRow,
  index: number,
  sourceFileName: string,
  process: ProcessType,
  analysisDate: Date,
  quality: QualitySummary,
): NormalizedRecord {
  const documentDate = parseDateValue(read(row, 'Дата'), 'documentDate', quality, true);
  const deadline = parseDateValue(read(row, 'Срок'), 'deadline', quality, true);
  const newDeadline = parseDateValue(read(row, 'Новый срок'), 'newDeadline', quality, false);
  const completionDate = parseDateValue(read(row, 'Дата завершения'), 'completionDate', quality, false);
  const rawOverdue = read(row, 'Просрочка');
  const isOpen = completionDate.date === null;

  if (isOpen && deadline.date === null) {
    quality.openRowsWithoutDeadline += 1;
  }

  const hasRawOverdue = rawOverdue.length > 0;
  const isOpenOverdue = isOpen && deadline.date !== null && deadline.date.getTime() < analysisDate.getTime();
  const status = resolveStatus(completionDate.date, hasRawOverdue, isOpenOverdue);
  const isOverdue = hasRawOverdue || isOpenOverdue;
  const overdueDays = resolveOverdueDays(rawOverdue, deadline.date, analysisDate, isOpenOverdue);

  return {
    id: `${process}-${sourceFileName}-${index}`,
    process,
    regNumber: read(row, 'Рег. номер'),
    legalEntity: read(row, 'Юр. лицо'),
    contractNumber: read(row, 'Номер договора'),
    documentType: read(row, 'Тип документа') || 'Не указан',
    documentDate: documentDate.date,
    author: read(row, 'Автор') || 'Не указан',
    subject: read(row, 'Тема'),
    taskText: read(row, 'Текст задания'),
    responsible: read(row, 'Ответственный') || 'Не указан',
    deadline: deadline.date,
    newDeadline: newDeadline.date,
    completionDate: completionDate.date,
    rawOverdue,
    overdueDays,
    status,
    isOverdue,
    isOpen,
    month: documentDate.date ? format(documentDate.date, 'yyyy-MM') : null,
    deadlineMonth: deadline.date ? format(deadline.date, 'yyyy-MM') : null,
    comment: read(row, 'Комментарий'),
    sourceFileName,
  };
}

function deduplicateRecords(records: NormalizedRecord[], quality: QualitySummary): NormalizedRecord[] {
  const seen = new Set<string>();
  const uniqueRecords: NormalizedRecord[] = [];

  for (const record of records) {
    const key = buildDuplicateKey(record);
    if (seen.has(key)) {
      quality.duplicateRows += 1;
      continue;
    }

    seen.add(key);
    uniqueRecords.push(record);
  }

  return uniqueRecords;
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
  ].join('\u001F');
}

function toTimestamp(date: Date | null): string {
  return date ? String(date.getTime()) : '';
}

function read(row: RawRow, column: string): string {
  return String(row[column] ?? '').trim();
}

function parseDateValue(value: string, field: DateField, quality: QualitySummary, required: boolean): ParseDateResult {
  if (!value) {
    if (required && field === 'documentDate') quality.invalidDocumentDates += 1;
    if (required && field === 'deadline') quality.invalidDeadlines += 1;
    return { date: null, invalid: required };
  }

  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(value, pattern, new Date());
    if (isValid(parsed)) {
      return { date: parsed, invalid: false };
    }
  }

  if (field === 'documentDate') quality.invalidDocumentDates += 1;
  if (field === 'deadline') quality.invalidDeadlines += 1;
  if (field === 'newDeadline') quality.invalidNewDeadlines += 1;
  if (field === 'completionDate') quality.invalidCompletionDates += 1;
  return { date: null, invalid: true };
}

function resolveStatus(completionDate: Date | null, hasRawOverdue: boolean, isOpenOverdue: boolean): TaskStatus {
  if (completionDate && !hasRawOverdue) return 'В срок';
  if (completionDate && hasRawOverdue) return 'Завершено с просрочкой';
  if (!completionDate && isOpenOverdue) return 'Открыто с просрочкой';
  return 'Открыто в работе';
}

function resolveOverdueDays(rawOverdue: string, deadline: Date | null, analysisDate: Date, isOpenOverdue: boolean): number {
  const parsed = parseOverdueText(rawOverdue);
  if (parsed > 0) return parsed;
  if (!isOpenOverdue || !deadline) return 0;

  const diffDays = (analysisDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24);
  return roundDays(Math.max(0, diffDays));
}

export function parseOverdueText(rawOverdue: string): number {
  const text = rawOverdue.trim().toLowerCase().replace(',', '.');
  if (!text) return 0;

  const match = text.match(/([\d.]+)\s*(час|часа|часов|день|дня|дней)/i);
  if (!match) return 0;

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return 0;

  if (match[2].startsWith('час')) {
    return roundDays(value / 24);
  }

  return roundDays(value);
}

function roundDays(value: number): number {
  return Math.round(value * 100) / 100;
}
