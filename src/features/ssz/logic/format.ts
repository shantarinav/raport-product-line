export function formatHours(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

export function formatPercent(value: number | null): string {
  if (value === null) return "í/ä";
  return `${(value * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
