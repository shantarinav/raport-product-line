import { ChartCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import type { SupportTopicSlaStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Tags, Flame } from "lucide-react";
import { motion } from "motion/react";

function getTicketWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "Р·Р°СЏРІРєР°";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "Р·Р°СЏРІРєРё";
  return "Р·Р°СЏРІРѕРє";
}

export function SupportTopicPareto({ rows, onCategorySelect }: { rows: SupportTopicSlaStat[]; onCategorySelect?: (category: SupportTopicSlaStat["category"]) => void }) {
  const maxOverdue = Math.max(1, ...rows.map((row) => row.overdue));

  return (
    <ChartCard title="РўРµРјС‹ РїСЂРѕСЃСЂРѕС‡РµРє" description="Р§С‚Рѕ РґР°РµС‚ РѕСЃРЅРѕРІРЅРѕР№ РІРєР»Р°Рґ РІ РѕР±С‰РёР№ РѕР±СЉРµРј РЅР°СЂСѓС€РµРЅРёР№ SLA." Icon={Tags}>
      <div className="grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-raport-muted py-4 text-center font-semibold">РќРµС‚ РїСЂРѕСЃСЂРѕС‡РµРє РїРѕ РІС‹Р±СЂР°РЅРЅС‹Рј С„РёР»СЊС‚СЂР°Рј.</p>
        ) : (
          <>
            {/* Sleek Legend / Instructions */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-raport-border bg-raport-surface-soft p-3 text-xs font-semibold text-raport-muted">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-raport-danger" />
                <span><strong>Р’РєР»Р°Рґ РІ СЃР±РѕРё:</strong> РґРѕР»СЏ РєР°С‚РµРіРѕСЂРёРё РІРѕ РІСЃС‘Рј РѕР±СЉС‘РјРµ РїСЂРѕСЃСЂРѕС‡РµРЅРЅС‹С… SLA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-raport-warning" />
                <span><strong>РќР°СЂСѓС€РµРЅРѕ SLA:</strong> РїСЂРѕС†РµРЅС‚ СЃР±РѕРµРІ РѕС‚ РѕР±СЉС‘РјР° РґР°РЅРЅРѕР№ РєР°С‚РµРіРѕСЂРёРё</span>
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
                      ? "border-raport-danger-border bg-raport-danger-muted shadow-sm"
                      : "border-raport-border bg-raport-surface hover:bg-raport-surface-soft"
                  }`}
                >
                  {/* Visual focus tag decoration */}
                  {isHighImpact && (
                    <div className="absolute right-0 top-0 h-1.5 w-16 bg-raport-danger rounded-bl-lg" />
                  )}

                  {/* Header info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-full border border-raport-border bg-raport-surface-soft px-1.5 text-[10px] font-extrabold tabular-nums text-raport-muted">
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
                          <Badge variant="danger" className="flex items-center gap-1 text-[10px] py-0.5">
                            <Flame className="h-3 w-3" />
                            Р¤РѕРєСѓСЃ РІРЅРёРјР°РЅРёСЏ
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-raport-muted">
                        Р’СЃРµРіРѕ СЃРѕР·РґР°РЅРѕ {row.total} {getTicketWord(row.total)} РІ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-2xl font-extrabold tracking-tight tabular-nums text-raport-text leading-none">
                        {row.overdue}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-raport-muted mt-0.5 block">
                        РїСЂРѕСЃСЂРѕС‡РµРЅРѕ
                      </span>
                    </div>
                  </div>

                  {/* Sleek dual horizontal meters */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-raport-border">
                    {/* Meter 1: Overdue contributions */}
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                        Р’РєР»Р°Рґ РІ СЃР±РѕРё
                      </span>
                      <div className="relative h-2 flex-1 rounded-full bg-raport-progress-track overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(row.overdue / maxOverdue) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute left-0 top-0 h-full bg-raport-danger rounded-full"
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-xs font-bold text-raport-danger shrink-0">
                        {formatSupportPercent(row.violationRate)}
                      </span>
                    </div>

                    {/* Meter 2: Inside topic violation rate */}
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                        РќР°СЂСѓС€РµРЅРѕ SLA
                      </span>
                      <div className="relative h-2 flex-1 rounded-full bg-raport-progress-track overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${row.violationRate * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`absolute left-0 top-0 h-full rounded-full ${
                            row.violationRate >= 0.4
                              ? "bg-raport-danger"
                              : row.violationRate >= 0.2
                              ? "bg-raport-warning"
                              : "bg-raport-success"
                          }`}
                        />
                      </div>
                      <span className={`w-12 text-right font-mono text-xs font-bold shrink-0 ${
                        row.violationRate >= 0.4 ? "text-raport-danger" : row.violationRate >= 0.2 ? "text-raport-warning" : "text-raport-success"
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
