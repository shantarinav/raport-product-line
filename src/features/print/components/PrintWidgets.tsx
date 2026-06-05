import { Badge } from "../../../shared/ui/shadcn/badge";
import { formatDateTime, formatInteger } from "../logic/dashboard";
import type { PrintBarDatum, PrintJob } from "../types";

function riskBadgeVariant(kind: PrintJob["riskReasons"][number]["kind"]): "danger" | "warning" | "default" {
  if (kind === "danger") return "danger";
  if (kind === "warning" || kind === "success") return "warning";
  return "default";
}

export function BarList({ items, valueLabel = "стр." }: { items: PrintBarDatum[]; valueLabel?: string }) {
  const max = Math.max(1, ...items.map((item) => item.pages));
  const hasData = items.some((item) => item.pages > 0);

  if (!hasData) {
    return (
      <p className="rounded-[var(--raport-radius-control)] border border-dashed border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-sm text-[var(--raport-muted)]">
        Нет данных по выбранным фильтрам.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex min-h-4 items-center justify-between gap-3 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="min-w-0 truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--raport-text)]">
              {formatInteger(item.pages)} {valueLabel}
            </span>
          </div>
          <progress
            max={max}
            value={item.pages}
            className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-moz-progress-bar]:bg-[var(--raport-primary)] [&::-webkit-progress-value]:bg-[var(--raport-primary)]"
          />
        </div>
      ))}
    </div>
  );
}

export function RiskJobList({ rows, onUserSelect }: { rows: PrintJob[]; onUserSelect: (user: string) => void }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--raport-radius-control)] border border-dashed border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-sm text-[var(--raport-muted)]">
        Нет заданий с отклонениями по выбранным фильтрам.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <article
          key={`${row.dateKey}-${row.user}-${row.documentName}-${index}`}
          className="grid gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2"
        >
          <div className="grid min-w-0 gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
            <span className="inline-flex min-h-7 min-w-9 items-center justify-center rounded-full border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-2 text-xs font-extrabold tabular-nums text-[var(--raport-primary)]">
              #{index + 1}
            </span>
            <div className="min-w-0">
              <button className="block max-w-full truncate text-left text-sm font-bold text-[var(--raport-primary)] hover:underline" onClick={() => onUserSelect(row.user)}>
                {row.user}
              </button>
              <p className="mt-0.5 truncate text-xs font-semibold text-[var(--raport-text)]" title={row.documentName}>
                {row.documentName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--raport-muted)] md:justify-end">
              <span className="tabular-nums text-[var(--raport-text)]">{formatInteger(row.totalPages)} стр.</span>
              <time dateTime={row.date?.toISOString()}>{formatDateTime(row.date)}</time>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="danger">Балл риска: {formatInteger(row.riskScore)}</Badge>
            {row.riskReasons.map((reason) => (
              <Badge key={`${row.documentName}-${reason.code}`} variant={riskBadgeVariant(reason.kind)}>
                {reason.label}
              </Badge>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
