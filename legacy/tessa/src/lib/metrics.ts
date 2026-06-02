import type {
  DocumentProblemMetric,
  DocumentTypeMetric,
  KpiMetrics,
  MonthlyMetric,
  NormalizedRecord,
  PersonMetric,
  ProcessStatusMetric,
  StatusMetric,
  TaskStatus,
} from './types';

export const STATUSES: TaskStatus[] = ['В срок', 'Завершено с просрочкой', 'Открыто с просрочкой', 'Открыто в работе'];

export function calculateKpis(records: NormalizedRecord[]): KpiMetrics {
  const overdueRecords = records.filter((record) => record.isOverdue);
  const total = records.length;
  const onTime = records.filter((record) => record.status === 'В срок').length;
  const openOverdue = records.filter((record) => record.status === 'Открыто с просрочкой').length;
  const maxOverdueDays = overdueRecords.reduce((max, record) => Math.max(max, record.overdueDays), 0);
  const averageOverdueDays =
    overdueRecords.length === 0
      ? 0
      : overdueRecords.reduce((sum, record) => sum + record.overdueDays, 0) / overdueRecords.length;

  return {
    total,
    onTime,
    overdue: overdueRecords.length,
    open: records.filter((record) => record.isOpen).length,
    openOverdue,
    averageOverdueDays,
    maxOverdueDays,
    onTimeRate: total === 0 ? 0 : (records.filter((record) => !record.isOverdue).length / total) * 100,
  };
}

export function buildStatusMetrics(records: NormalizedRecord[]): StatusMetric[] {
  return STATUSES.map((status) => ({
    status,
    count: records.filter((record) => record.status === status).length,
  }));
}

export function buildProcessStatusMetrics(records: NormalizedRecord[]): ProcessStatusMetric[] {
  return STATUSES.map((status) => ({
    status,
    Согласование: records.filter((record) => record.process === 'Согласование' && record.status === status).length,
    Исполнение: records.filter((record) => record.process === 'Исполнение' && record.status === status).length,
  }));
}

export function buildMonthlyMetrics(records: NormalizedRecord[]): MonthlyMetric[] {
  const grouped = new Map<string, NormalizedRecord[]>();
  records.forEach((record) => {
    if (!record.month) return;
    grouped.set(record.month, [...(grouped.get(record.month) ?? []), record]);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthRecords]) => ({
      month,
      total: monthRecords.length,
      onTimeRate:
        monthRecords.length === 0
          ? 0
          : (monthRecords.filter((record) => !record.isOverdue).length / monthRecords.length) * 100,
    }));
}

export function buildResponsibleMetrics(records: NormalizedRecord[], limit = 30): PersonMetric[] {
  return buildPersonMetrics(records, (record) => record.responsible)
    .sort((a, b) => b.openOverdue - a.openOverdue || b.total - a.total || b.overdueRate - a.overdueRate)
    .slice(0, limit);
}

export function buildAuthorMetrics(records: NormalizedRecord[], limit = 30): PersonMetric[] {
  return buildPersonMetrics(records, (record) => record.author)
    .sort((a, b) => b.total - a.total || b.overdueRate - a.overdueRate)
    .slice(0, limit);
}

export function buildDocumentTypeMetrics(records: NormalizedRecord[], limit = 30): DocumentTypeMetric[] {
  const grouped = groupBy(records, (record) => record.documentType);

  return Array.from(grouped.entries())
    .map(([name, group]) => {
      const overdue = group.filter((record) => record.isOverdue).length;
      return {
        name,
        total: group.length,
        approval: group.filter((record) => record.process === 'Согласование').length,
        execution: group.filter((record) => record.process === 'Исполнение').length,
        overdue,
        openOverdue: group.filter((record) => record.status === 'Открыто с просрочкой').length,
        overdueRate: group.length === 0 ? 0 : (overdue / group.length) * 100,
      };
    })
    .sort((a, b) => b.openOverdue - a.openOverdue || b.total - a.total || b.overdueRate - a.overdueRate)
    .slice(0, limit);
}

export function buildDocumentProblemMetrics(records: NormalizedRecord[], limit = 30): DocumentProblemMetric[] {
  const problemRecords = records.filter((record) => record.isOverdue);
  const grouped = groupBy(problemRecords, (record) => record.regNumber || 'Без рег. номера');

  return Array.from(grouped.entries())
    .filter(([, group]) => group.length > 1)
    .map(([regNumber, group]) => ({
      regNumber,
      subject: group[0]?.subject ?? '',
      documentType: group[0]?.documentType ?? '',
      totalProblems: group.length,
      openOverdue: group.filter((record) => record.status === 'Открыто с просрочкой').length,
      maxOverdueDays: group.reduce((max, record) => Math.max(max, record.overdueDays), 0),
    }))
    .sort((a, b) => b.openOverdue - a.openOverdue || b.totalProblems - a.totalProblems || b.maxOverdueDays - a.maxOverdueDays)
    .slice(0, limit);
}

export function getOpenOverdue(records: NormalizedRecord[], limit = 20): NormalizedRecord[] {
  return records
    .filter((record) => record.status === 'Открыто с просрочкой')
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, limit);
}

export function getLongestOverdue(records: NormalizedRecord[], limit = 20): NormalizedRecord[] {
  return records
    .filter((record) => record.isOverdue)
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, limit);
}

export function getMultiProblemDocumentKeys(records: NormalizedRecord[]): Set<string> {
  const grouped = groupBy(
    records.filter((record) => record.isOverdue),
    (record) => record.regNumber,
  );
  return new Set(Array.from(grouped.entries()).filter(([key, group]) => key && group.length > 1).map(([key]) => key));
}

function buildPersonMetrics(
  records: NormalizedRecord[],
  selectName: (record: NormalizedRecord) => string,
): PersonMetric[] {
  const grouped = groupBy(records, selectName);

  return Array.from(grouped.entries()).map(([name, group]) => {
    const overdueRecords = group.filter((record) => record.isOverdue);
    const typeCounts = Array.from(groupBy(group, (record) => record.documentType).entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([type]) => type)
      .join(', ');

    return {
      name,
      total: group.length,
      onTime: group.filter((record) => record.status === 'В срок').length,
      completedOverdue: group.filter((record) => record.status === 'Завершено с просрочкой').length,
      openOverdue: group.filter((record) => record.status === 'Открыто с просрочкой').length,
      overdueRate: group.length === 0 ? 0 : (overdueRecords.length / group.length) * 100,
      averageOverdueDays:
        overdueRecords.length === 0
          ? 0
          : overdueRecords.reduce((sum, record) => sum + record.overdueDays, 0) / overdueRecords.length,
      topDocumentTypes: typeCounts || 'Нет данных',
    };
  });
}

function groupBy<T>(items: T[], selectKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const key = selectKey(item) || 'Не указан';
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return grouped;
}
