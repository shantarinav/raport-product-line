import type { ReportPeriod } from "./types";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

export function formatReportPeriod(period: ReportPeriod): string {
  const start = formatDate(period.start);
  const end = formatDate(period.end);

  if (start && end) return `${start} - ${end}`;
  return period.label || "Нет периода";
}

export function formatImportedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не определена";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
