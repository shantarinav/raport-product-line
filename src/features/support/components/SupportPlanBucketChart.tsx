import { ChartCard } from "../../../shared/ui";
import type { SupportPlanBucketStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Gauge, Flame } from "lucide-react";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { motion } from "motion/react";

function getTicketWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заявка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки";
  return "заявок";
}

export function SupportPlanBucketChart({ rows }: { rows: SupportPlanBucketStat[] }) {
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));
  const totalVolume = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <ChartCard title="SLA-сроки под нагрузкой" description="Какие плановые сроки чаще превращаются в просрочку." Icon={Gauge}>
      <div className="grid gap-3">
        {/* Sleek Legend / Instructions */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-raport-border bg-raport-surface-soft p-3 text-xs font-semibold text-raport-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-blue-500" />
            <span><strong>Доля в потоке:</strong> распределение входящих заявок по группам</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-red-500" />
            <span><strong>Нарушено SLA:</strong> процент сбоев от объема группы</span>
          </div>
        </div>

        {rows.map((row, index) => {
          const isHot = row.isHotspot;
          const violationT = row.violationRate;

          return (
            <motion.article 
              key={row.bucket}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 ${
                isHot 
                  ? "border-red-300 bg-red-50/20 shadow-sm ring-1 ring-red-500/20" 
                  : "border-raport-border bg-white hover:border-slate-400 hover:shadow-sm"
              }`}
            >
              {/* Optional Hotspot accent light indicator */}
              {isHot && (
                <div className="absolute right-0 top-0 h-1.5 w-16 bg-gradient-to-l from-red-500 to-rose-600 rounded-bl-lg" />
              )}

              {/* Bucket details header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-slate-900 tracking-tight">
                      {row.bucket}
                    </span>
                    {isHot ? (
                      <Badge variant="danger" className="animate-pulse flex items-center gap-1 font-bold text-[10px] bg-red-600 text-white border-0 py-0.5">
                        <Flame className="h-3.1 w-3.1" />
                        Фокус нагрузки
                      </Badge>
                    ) : violationT >= 0.4 ? (
                      <Badge variant="warning" className="font-bold text-[10px] bg-amber-500 text-white border-0 py-0.5">Важно</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-raport-muted font-semibold">
                    <span>{row.total} {getTicketWord(row.total)}</span>
                    <span>·</span>
                    <span className="text-red-600 font-bold">{row.overdue} просрочено</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 leading-none">
                    {formatSupportPercent(row.violationRate)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-raport-muted mt-0.5 block">
                    сбоев SLA
                  </span>
                </div>
              </div>

              {/* Sleek dual horizontal meters */}
              <div className="mt-4 space-y-2 pt-3 border-t border-slate-100/80">
                {/* Meter 1: Load volume */}
                <div className="flex items-center gap-3">
                  <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                    Доля в потоке
                  </span>
                  <div className="relative h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.total / maxTotal) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-xs font-bold text-blue-700 shrink-0">
                    {formatSupportPercent(row.total / Math.max(1, totalVolume))}
                  </span>
                </div>
 
                {/* Meter 2: SLA failure rate */}
                <div className="flex items-center gap-3">
                  <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                    Нарушено SLA
                  </span>
                  <div className="relative h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${violationT * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute left-0 top-0 h-full rounded-full ${
                        violationT >= 0.4
                          ? "bg-red-500"
                          : violationT >= 0.2
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                  </div>
                  <span className={`w-12 text-right font-mono text-xs font-bold shrink-0 ${
                    violationT >= 0.4 ? "text-red-650" : violationT >= 0.2 ? "text-amber-655" : "text-emerald-600"
                  }`}>
                    {formatSupportPercent(violationT)}
                  </span>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </ChartCard>
  );
}
