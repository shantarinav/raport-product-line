import { ChartCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import type { SupportTopicSlaStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Tags, Flame } from "lucide-react";
import { motion } from "motion/react";

function getTicketWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заявка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки";
  return "заявок";
}

export function SupportTopicPareto({ rows, onCategorySelect }: { rows: SupportTopicSlaStat[]; onCategorySelect?: (category: SupportTopicSlaStat["category"]) => void }) {
  const maxOverdue = Math.max(1, ...rows.map((row) => row.overdue));

  return (
    <ChartCard title="Темы просрочек" description="Что дает основной вклад в общий объем нарушений SLA." Icon={Tags}>
      <div className="grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-raport-muted py-4 text-center font-semibold">Нет просрочек по выбранным фильтрам.</p>
        ) : (
          <>
            {/* Sleek Legend / Instructions */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-raport-border bg-raport-surface-soft p-3 text-xs font-semibold text-raport-muted">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-red-500" />
                <span><strong>Вклад в сбои:</strong> доля категории во всём объёме просроченных SLA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-amber-500" />
                <span><strong>Нарушено SLA:</strong> процент сбоев от объёма данной категории</span>
              </div>
            </div>

            {rows.map((row, index) => {
              const violationRateT = row.violationRate;
              const isHighImpact = violationRateT >= 0.3 || row.violationRate >= 0.4;

              return (
                <motion.article 
                  key={row.category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 ${
                    isHighImpact 
                      ? "border-red-300 bg-red-50/10 shadow-sm ring-1 ring-red-500/10" 
                      : "border-raport-border bg-white hover:border-slate-400 hover:shadow-sm"
                  }`}
                >
                  {/* Visual focus tag decoration */}
                  {isHighImpact && (
                    <div className="absolute right-0 top-0 h-1.5 w-16 bg-gradient-to-l from-red-500 to-rose-600 rounded-bl-lg" />
                  )}

                  {/* Header info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-extrabold tabular-nums text-slate-700">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          className="block max-w-full truncate text-left text-base font-extrabold text-raport-primary hover:underline leading-tight"
                          title={row.category}
                          onClick={() => onCategorySelect?.(row.category)}
                        >
                          {row.category}
                        </button>
                        {isHighImpact ? (
                          <Badge variant="danger" className="animate-pulse flex items-center gap-1 font-bold text-[10px] bg-red-600 text-white border-0 py-0.5">
                            <Flame className="h-3 w-3" />
                            Фокус внимания
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-raport-muted">
                        Всего создано {row.total} {getTicketWord(row.total)} в этой категории
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 leading-none">
                        {row.overdue}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-raport-muted mt-0.5 block">
                        просрочено
                      </span>
                    </div>
                  </div>

                  {/* Sleek dual horizontal meters */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-slate-100/80">
                    {/* Meter 1: Overdue contributions */}
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                        Вклад в сбои
                      </span>
                      <div className="relative h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(row.overdue / maxOverdue) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-xs font-bold text-red-600 shrink-0">
                        {formatSupportPercent(row.violationRate)}
                      </span>
                    </div>

                    {/* Meter 2: Inside topic violation rate */}
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                        Нарушено SLA
                      </span>
                      <div className="relative h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${row.violationRate * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`absolute left-0 top-0 h-full rounded-full ${
                            row.violationRate >= 0.4
                              ? "bg-red-500"
                              : row.violationRate >= 0.2
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                      </div>
                      <span className={`w-12 text-right font-mono text-xs font-bold shrink-0 ${
                        row.violationRate >= 0.4 ? "text-red-650" : row.violationRate >= 0.2 ? "text-amber-655" : "text-emerald-600"
                      }`}>
                        {formatSupportPercent(row.violationRate)}
                      </span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </>
        )}
      </div>
    </ChartCard>
  );
}
