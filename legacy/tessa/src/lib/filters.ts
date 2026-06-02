import { format, parseISO } from 'date-fns';
import { getMultiProblemDocumentKeys } from './metrics';
import type { Filters, NormalizedRecord } from './types';

export const DEFAULT_FILTERS: Filters = {
  process: 'Все',
  documentDateFrom: '',
  documentDateTo: '',
  deadlineFrom: '',
  deadlineTo: '',
  documentType: '',
  author: '',
  responsible: '',
  status: '',
  legalEntity: '',
  search: '',
  quickPreset: 'all',
};

export function applyFilters(records: NormalizedRecord[], filters: Filters): NormalizedRecord[] {
  const query = filters.search.trim().toLowerCase();
  const documentDateFrom = filters.documentDateFrom ? parseISO(filters.documentDateFrom) : null;
  const documentDateTo = filters.documentDateTo ? parseISO(filters.documentDateTo) : null;
  const deadlineFrom = filters.deadlineFrom ? parseISO(filters.deadlineFrom) : null;
  const deadlineTo = filters.deadlineTo ? parseISO(filters.deadlineTo) : null;
  const multiProblemDocs = filters.quickPreset === 'multiProblemDocs' ? getMultiProblemDocumentKeys(records) : null;

  return records.filter((record) => {
    if (filters.process !== 'Все' && record.process !== filters.process) return false;
    if (filters.documentType && record.documentType !== filters.documentType) return false;
    if (filters.author && record.author !== filters.author) return false;
    if (filters.responsible && record.responsible !== filters.responsible) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.legalEntity && record.legalEntity !== filters.legalEntity) return false;

    if (documentDateFrom && (!record.documentDate || record.documentDate < documentDateFrom)) return false;
    if (documentDateTo && (!record.documentDate || record.documentDate > endOfLocalDay(documentDateTo))) return false;
    if (deadlineFrom && (!record.deadline || record.deadline < deadlineFrom)) return false;
    if (deadlineTo && (!record.deadline || record.deadline > endOfLocalDay(deadlineTo))) return false;

    if (filters.quickPreset === 'open' && !record.isOpen) return false;
    if (filters.quickPreset === 'openOverdue' && record.status !== 'Открыто с просрочкой') return false;
    if (filters.quickPreset === 'completedOverdue' && record.status !== 'Завершено с просрочкой') return false;
    if (multiProblemDocs && !multiProblemDocs.has(record.regNumber)) return false;

    if (query) {
      const haystack = `${record.regNumber} ${record.subject} ${record.taskText}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function buildFilterOptions(records: NormalizedRecord[]) {
  return {
    documentTypes: uniqueSorted(records.map((record) => record.documentType)),
    authors: uniqueSorted(records.map((record) => record.author)),
    responsibles: uniqueSorted(records.map((record) => record.responsible)),
    legalEntities: uniqueSorted(records.map((record) => record.legalEntity).filter(Boolean)),
  };
}

export function toInputDate(date: Date | null): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'));
}

function endOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
