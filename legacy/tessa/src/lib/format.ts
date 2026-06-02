import { format } from 'date-fns';

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function formatDate(date: Date | null): string {
  return date ? format(date, 'dd.MM.yyyy') : '';
}

export function formatDateTime(date: Date | null): string {
  return date ? format(date, 'dd.MM.yyyy HH:mm:ss') : '';
}
