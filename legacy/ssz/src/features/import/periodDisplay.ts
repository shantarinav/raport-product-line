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
  return period.label || "Не определён";
}
