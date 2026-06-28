import { ChartCard } from "../../../shared/ui";
import type { SupportPlanBucketStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Gauge, Flame } from "lucide-react";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { motion } from "motion/react";

function getTicketWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "Р·Р°СЏРІРєР°";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "Р·Р°СЏРІРєРё";
  return "Р·Р°СЏРІРѕРє";
}

export function SupportPlanBucketChart({ rows }: { rows: SupportPlanBucketStat[] }) {
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));
  const totalVolume = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <ChartCard title="SLA-СЃСЂРѕРєРё РїРѕРґ РЅР°РіСЂСѓР·РєРѕР№" description="РљР°РєРёРµ РїР»Р°РЅРѕРІС‹Рµ СЃСЂРѕРєРё С‡Р°С‰Рµ РїСЂРµРІСЂР°С‰Р°СЋС‚СЃСЏ РІ РїСЂРѕСЃСЂРѕС‡РєСѓ." Icon={Gauge}>
      <div className="grid gap-3">
        {/* Sleek Legend / Instructions */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-raport-border bg-raport-surface-soft p-3 text-xs font-semibold text-raport-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-raport-primary" />
            <span><strong>Р”РѕР»СЏ РІ РїРѕС‚РѕРєРµ:</strong> СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ РІС…РѕРґСЏС‰РёС… Р·Р°СЏРІРѕРє РїРѕ РіСЂСѓРїРїР°Рј</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-raport-danger" />
            <span><strong>РќР°СЂСѓС€РµРЅРѕ SLA:</strong> РїСЂРѕС†РµРЅС‚ СЃР±РѕРµРІ РѕС‚ РѕР±СЉРµРјР° РіСЂСѓРїРїС‹</span>
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
                  ? "border-raport-danger-border bg-raport-danger-muted shadow-sm"
                  : "border-raport-border bg-raport-surface hover:bg-raport-surface-soft"
              }`}
            >
              {/* Optional Hotspot accent light indicator */}
              {isHot && (
                <div className="absolute right-0 top-0 h-1.5 w-16 bg-raport-danger rounded-bl-lg" />
              )}

              {/* Bucket details header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-raport-text tracking-tight">
                      {row.bucket}
                    </span>
                    {isHot ? (
                      <Badge variant="danger" className="flex items-center gap-1 text-[10px] py-0.5">
                        <Flame className="h-3 w-3" />
                        Р¤РѕРєСѓСЃ РЅР°РіСЂСѓР·РєРё
                      </Badge>
                    ) : violationT >= 0.4 ? (
                      <Badge variant="warning" className="font-bold text-[10px] py-0.5">Р’Р°Р¶РЅРѕ</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-raport-muted font-semibold">
                    <span>{row.total} {getTicketWord(row.total)}</span>
                    <span>В·</span>
                    <span className="text-raport-danger font-bold">{row.overdue} РїСЂРѕСЃСЂРѕС‡РµРЅРѕ</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-2xl font-extrabold tracking-tight tabular-nums text-raport-text leading-none">
                    {formatSupportPercent(row.violationRate)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-raport-muted mt-0.5 block">
                    СЃР±РѕРµРІ SLA
                  </span>
                </div>
              </div>

              {/* Sleek dual horizontal meters */}
              <div className="mt-4 space-y-2 pt-3 border-t border-raport-border">
                {/* Meter 1: Load volume */}
                <div className="flex items-center gap-3">
                  <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                    Р”РѕР»СЏ РІ РїРѕС‚РѕРєРµ
                  </span>
                  <div className="relative h-2 flex-1 rounded-full bg-raport-progress-track overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.total / maxTotal) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-raport-primary rounded-full"
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-xs font-bold text-raport-primary shrink-0">
                    {formatSupportPercent(row.total / Math.max(1, totalVolume))}
                  </span>
                </div>

                {/* Meter 2: SLA failure rate */}
                <div className="flex items-center gap-3">
                  <span className="w-24 text-[10px] font-extrabold uppercase tracking-wider text-raport-muted shrink-0">
                    РќР°СЂСѓС€РµРЅРѕ SLA
                  </span>
                  <div className="relative h-2 flex-1 rounded-full bg-raport-progress-track overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${violationT * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute left-0 top-0 h-full rounded-full ${
                        violationT >= 0.4
                          ? "bg-raport-danger"
                          : violationT >= 0.2
                          ? "bg-raport-warning"
                          : "bg-raport-success"
                      }`}
                    />
                  </div>
                  <span className={`w-12 text-right font-mono text-xs font-bold shrink-0 ${
                    violationT >= 0.4 ? "text-raport-danger" : violationT >= 0.2 ? "text-raport-warning" : "text-raport-success"
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
