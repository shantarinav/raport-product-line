import { Activity } from "lucide-react";
import { ChartCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { formatSupportPercent } from "../logic/supportMetrics";
import type { SupportCategory, SupportTopicSlaStat } from "../supportTypes";

function slaVariant(value: number, controlPercent: number): "success" | "warning" | "danger" | "secondary" {
  if (value >= 0.95) return "success";
  if (value >= controlPercent / 100) return "warning";
  if (value > 0) return "danger";
  return "secondary";
}

function slaLabel(value: number, applicable: number, controlPercent: number): string {
  if (applicable === 0) return "Нет расчета";
  if (value >= 0.95) return "Норма";
  if (value >= controlPercent / 100) return "Контроль";
  return "Критично";
}

function intensityVariant(value: SupportTopicSlaStat["intensity"]): "secondary" | "warning" | "danger" {
  if (value === "высокая") return "danger";
  if (value === "средняя") return "warning";
  return "secondary";
}

export function SupportTopicSlaMatrix({
  rows,
  controlPercent,
  onCategorySelect,
}: {
  rows: SupportTopicSlaStat[];
  controlPercent: number;
  onCategorySelect?: (category: SupportCategory) => void;
}) {
  return (
    <ChartCard title="SLA по темам" description="Соблюдение SLA и интенсивность обращений по категориям." Icon={Activity}>
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2">
          <span className="basis-full text-xs font-semibold text-[var(--raport-muted)]">
            Каждая строка — категория обращений. Полоса показывает состав заявок: в SLA, нарушено, нет расчета.
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            В SLA
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Нарушен SLA
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            Нет расчета SLA
          </span>
          <span className="basis-full text-[11px] font-semibold text-[var(--raport-muted)]">
            Сортировка: больше заявок → хуже SLA → больше нарушений.
          </span>
        </div>

        {rows.length === 0 ? <p className="text-sm text-[var(--raport-muted)]">Нет заявок по выбранным фильтрам.</p> : null}

        <div className="grid gap-2">
          {rows.map((row, index) => {
            const inSlaWidth = row.total > 0 ? (row.inSla / row.total) * 100 : 0;
            const overdueWidth = row.total > 0 ? (row.overdue / row.total) * 100 : 0;
            const overdueX = inSlaWidth;

            return (
              <article
                key={row.category}
                className="grid gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2 text-left"
              >
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
                    <span className="inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-2 text-xs font-extrabold tabular-nums text-[var(--raport-primary)]">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onCategorySelect?.(row.category)}
                        className="block max-w-full truncate text-left text-sm font-extrabold text-[var(--raport-primary)] hover:underline"
                        title={row.category}
                      >
                        {row.category}
                      </button>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--raport-muted)]">
                        Соблюдение SLA внутри категории
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Badge variant={intensityVariant(row.intensity)}>интенсивность: {row.intensity}</Badge>
                    <Badge variant={slaVariant(row.slaRate, controlPercent)}>{slaLabel(row.slaRate, row.applicable, controlPercent)}</Badge>
                    <strong className="min-w-16 text-right text-lg font-extrabold tabular-nums text-[var(--raport-text)]">
                      {row.applicable > 0 ? formatSupportPercent(row.slaRate) : "—"}
                    </strong>
                  </div>
                </div>

                <div className="grid gap-1">
                  <svg
                    viewBox="0 0 100 14"
                    preserveAspectRatio="none"
                    className="h-4 w-full overflow-hidden rounded-full bg-slate-500 ring-1 ring-slate-200"
                    aria-hidden="true"
                  >
                    <rect x="0" y="0" width="100" height="14" className="fill-slate-500" />
                    <rect x="0" y="0" width={inSlaWidth} height="14" className="fill-emerald-500" />
                    <rect x={overdueX} y="0" width={overdueWidth} height="14" className="fill-red-500" />
                  </svg>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--raport-muted)]">
                    <span>
                      Заявок: <strong className="text-[var(--raport-text)]">{row.total}</strong> · с расчетом SLA:{" "}
                      <strong className="text-[var(--raport-text)]">{row.applicable}</strong>
                      {row.dataProblems > 0 ? (
                        <>
                          {" "}· без расчета: <strong className="text-slate-700">{row.dataProblems}</strong>
                        </>
                      ) : null}
                    </span>
                    <span>
                      В SLA: <strong className="text-emerald-700">{row.inSla}</strong> · Нарушено:{" "}
                      <strong className="text-red-700">{row.overdue}</strong>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
