import { ChartCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import type { SupportTopicStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Tags } from "lucide-react";

function riskVariant(value: number): "danger" | "warning" | "success" {
  if (value >= 0.4) return "danger";
  if (value >= 0.2) return "warning";
  return "success";
}

function riskLabel(value: number): string {
  if (value >= 0.4) return "высокий риск";
  if (value >= 0.2) return "средний риск";
  return "низкий риск";
}

export function SupportTopicPareto({ rows, onCategorySelect }: { rows: SupportTopicStat[]; onCategorySelect?: (category: SupportTopicStat["category"]) => void }) {
  const maxOverdue = Math.max(1, ...rows.map((row) => row.overdue));

  return (
    <ChartCard title="Темы просрочек" description="Что дает основной вклад в общий объем нарушений SLA." Icon={Tags}>
      <div className="grid gap-2">
        {rows.length === 0 ? <p className="text-sm text-[var(--raport-muted)]">Нет просрочек по выбранным фильтрам.</p> : null}
        {rows.map((row, index) => {
          const barWidth = Math.max(3, (row.overdue / maxOverdue) * 100);
          return (
            <article key={row.category} className="grid gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-2">
                  <span className="inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-2 text-xs font-extrabold tabular-nums text-[var(--raport-primary)]">
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="block max-w-full truncate text-left text-sm font-extrabold text-[var(--raport-primary)] hover:underline"
                      title={row.category}
                      onClick={() => onCategorySelect?.(row.category)}
                    >
                      {row.category}
                    </button>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--raport-muted)]">
                      {formatSupportPercent(row.overdueShare)} вклада в просрочки · всего {row.total} заявок
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <strong className="block text-lg font-extrabold tabular-nums text-[var(--raport-text)]">{row.overdue}</strong>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--raport-muted)]">проср.</span>
                </div>
              </div>

              <svg viewBox="0 0 100 10" className="h-3 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <rect x="0" y="0" width={barWidth} height="10" rx="5" className="fill-red-500" />
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--raport-muted)]">
                <span>Нарушение внутри темы: <strong className="text-[var(--raport-text)]">{formatSupportPercent(row.violationRate)}</strong></span>
                <Badge variant={riskVariant(row.violationRate)}>{riskLabel(row.violationRate)}</Badge>
              </div>
            </article>
          );
        })}
      </div>
    </ChartCard>
  );
}
