import type { NormalizedRecord } from './types';
import { formatDateTime, formatNumber } from './format';

const EXPORT_COLUMNS: Array<[string, (record: NormalizedRecord) => string]> = [
  ['Процесс', (record) => record.process],
  ['Рег. номер', (record) => record.regNumber],
  ['Тип документа', (record) => record.documentType],
  ['Дата', (record) => formatDateTime(record.documentDate)],
  ['Автор', (record) => record.author],
  ['Тема', (record) => record.subject],
  ['Текст задания', (record) => record.taskText],
  ['Ответственный', (record) => record.responsible],
  ['Срок', (record) => formatDateTime(record.deadline)],
  ['Новый срок', (record) => formatDateTime(record.newDeadline)],
  ['Дата завершения', (record) => formatDateTime(record.completionDate)],
  ['Статус', (record) => record.status],
  ['Просрочка в днях', (record) => formatNumber(record.overdueDays)],
  ['Комментарий', (record) => record.comment],
];

export function downloadRecordsCsv(records: NormalizedRecord[]): void {
  const rows = [
    EXPORT_COLUMNS.map(([header]) => escapeCsv(header)).join(';'),
    ...records.map((record) => EXPORT_COLUMNS.map(([, getValue]) => escapeCsv(getValue(record))).join(';')),
  ];

  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `raport-tessa-problems-${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsv(value: string): string {
  const safe = value ?? '';
  if (/[;"\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
