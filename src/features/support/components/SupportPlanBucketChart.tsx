import { ChartCard } from "../../../shared/ui";
import type { SupportPlanBucketStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Gauge } from "lucide-react";
import { Badge } from "../../../shared/ui/shadcn/badge";

function violationVariant(value: number): "danger" | "warning" | "success" {
  if (value >= 0.4) return "danger";
  if (value >= 0.2) return "warning";
  return "success";
}

export function SupportPlanBucketChart({ rows }: { rows: SupportPlanBucketStat[] }) {
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));

  return (
    <ChartCard title="SLA-сроки под нагрузкой" description="Какие плановые сроки чаще превращаются в просрочку." Icon={Gauge}>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Синяя полоса: нагрузка
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Красный сегмент: просрочено
          </span>
        </div>
        {rows.map((row) => {
          const totalWidth = Math.max(2, (row.total / maxTotal) * 100);
          const overdueWidth = row.total > 0 ? Math.max(0, (row.overdue / row.total) * totalWidth) : 0;
          return (
            <article key={row.bucket} className="grid gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h4 className="truncate text-sm font-extrabold text-[var(--raport-text)]">{row.bucket}</h4>
                    {row.isHotspot ? <Badge variant="danger">Фокус</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--raport-muted)]">
                    {row.total} заявок · {row.overdue} просрочено · {formatSupportPercent(row.overdueShare)} от всех просрочек
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <strong className="block text-lg font-extrabold tabular-nums text-[var(--raport-text)]">{formatSupportPercent(row.violationRate)}</strong>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--raport-muted)]">нарушений</span>
                </div>
              </div>

              <svg viewBox="0 0 100 12" className="h-4 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <rect x="0" y="0" width={totalWidth} height="12" rx="6" className="fill-blue-500" opacity="0.72" />
                <rect x="0" y="0" width={overdueWidth} height="12" rx="6" className="fill-red-500" />
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--raport-muted)]">
                <span>Доля срока в просрочках: <strong className="text-[var(--raport-text)]">{formatSupportPercent(row.overdueShare)}</strong></span>
                <Badge variant={violationVariant(row.violationRate)}>{row.isHotspot ? "главный источник" : "риск срока"}</Badge>
              </div>
            </article>
          );
        })}
      </div>
    </ChartCard>
  );
}
