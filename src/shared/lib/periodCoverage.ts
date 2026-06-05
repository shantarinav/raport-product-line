const DAY_MS = 24 * 60 * 60 * 1000;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateKey(value: string): DateParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1) return null;

  return { year, month, day };
}

function dateUtc({ year, month, day }: DateParts): number {
  return Date.UTC(year, month - 1, day);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function nextMonth(year: number, month: number): DateParts {
  return month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
}

export function isMonthlyCoverageReady(dateFrom: string, dateTo: string, minRatio = 0.5): boolean {
  const from = parseDateKey(dateFrom);
  const to = parseDateKey(dateTo);
  if (!from || !to) return false;

  const fromMs = dateUtc(from);
  const toMs = dateUtc(to);
  if (toMs < fromMs) return false;

  let cursor = { year: from.year, month: from.month, day: 1 };
  let selectedDays = 0;
  let calendarDays = 0;

  while (dateUtc(cursor) <= toMs) {
    const monthDays = daysInMonth(cursor.year, cursor.month);
    const monthStartMs = Date.UTC(cursor.year, cursor.month - 1, 1);
    const monthEndMs = Date.UTC(cursor.year, cursor.month - 1, monthDays);
    const selectedStartMs = Math.max(fromMs, monthStartMs);
    const selectedEndMs = Math.min(toMs, monthEndMs);

    if (selectedStartMs <= selectedEndMs) {
      selectedDays += Math.floor((selectedEndMs - selectedStartMs) / DAY_MS) + 1;
      calendarDays += monthDays;
    }

    cursor = nextMonth(cursor.year, cursor.month);
  }

  return calendarDays > 0 && selectedDays / calendarDays >= minRatio;
}

export function monthStartDateKey(value: string): string {
  const parsed = parseDateKey(value);
  if (!parsed) return "";
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}-01`;
}
