import { useState } from "react";
import { DashboardSwitch, SectionCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import type { SupportTopicSlaStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Layers, Flame, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function getTicketWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "Р·Р°СЏРІРєР°";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "Р·Р°СЏРІРєРё";
  return "Р·Р°СЏРІРѕРє";
}

interface SupportTopicSlaChartProps {
  rows: SupportTopicSlaStat[];
  onCategorySelect?: (category: SupportTopicSlaStat["category"]) => void;
}

export function SupportTopicSlaChart({ rows, onCategorySelect }: SupportTopicSlaChartProps) {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Calculate total volume to compute "Share in РїРѕС‚РѕРє"
  const totalVolume = rows.reduce((sum, row) => sum + row.total, 0);
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));

  // Sort rows: first show categories with worse SLA compliance (higher violation rate)
  // to highlight potential SLA trouble spots at the top.
  const sortedRows = [...rows].sort((a, b) => b.violationRate - a.violationRate || b.total - a.total);

  return (
    <SectionCard
      title="SLA РїРѕ С‚РµРјР°Рј"
      description="РЈСЂРѕРІРµРЅСЊ СЃРѕР±Р»СЋРґРµРЅРёСЏ СЃРѕРіР»Р°С€РµРЅРёСЏ РѕР± СѓСЂРѕРІРЅРµ СѓСЃР»СѓРі (SLA) Рё РёРЅС‚РµРЅСЃРёРІРЅРѕСЃС‚СЊ РѕР±СЂР°С‰РµРЅРёР№ РїРѕ РєР°С‚РµРіРѕСЂРёСЏРј."
      Icon={Layers}
      actions={
        <DashboardSwitch
          value={viewMode}
          onChange={(next) => setViewMode(next as "table" | "cards")}
          options={[
            { value: "table", label: "???????" },
            { value: "cards", label: "?????" },
          ]}
        />
      }
    >
      <div className="grid gap-4">
        {sortedRows.length === 0 ? (
          <p className="text-sm text-raport-muted py-4 text-center font-semibold">РќРµС‚ РґР°РЅРЅС‹С… РїРѕ РІС‹Р±СЂР°РЅРЅС‹Рј С„РёР»СЊС‚СЂР°Рј.</p>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === "table" ? (
              <motion.div
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col"
              >
                {/* Header */}
                <div className="hidden md:grid grid-cols-[40px_3fr_1fr_1fr_2fr] gap-4 px-4 pb-3 text-[10px] font-extrabold text-raport-muted uppercase tracking-wider border-b border-raport-border mb-3">
                  <div className="text-center">в„–</div>
                  <div>РўРµРјР° / РљР°С‚РµРіРѕСЂРёСЏ</div>
                  <div className="text-center">Р’СЃРµРіРѕ Р·Р°СЏРІРѕРє</div>
                  <div className="text-center">РџСЂРѕСЃСЂРѕС‡РµРЅРѕ</div>
                  <div>Р’С‹РїРѕР»РЅРµРЅРёРµ SLA</div>
                </div>

                {/* Rows */}
                <div className="flex flex-col gap-2.5">
                  {sortedRows.map((row, index) => {
                    const slaCompliance = 1 - row.violationRate;
                    const isDanger = slaCompliance < 0.8;
                    const isWarning = slaCompliance >= 0.8 && slaCompliance < 0.95;
                    // const isSuccess = slaCompliance >= 0.95;

                    return (
                      <div
                        key={row.category}
                        className={`group relative grid grid-cols-1 md:grid-cols-[40px_3fr_1fr_1fr_2fr] gap-x-4 gap-y-3 p-3 md:p-4 md:items-center rounded-2xl border transition-all duration-200 ${
                          isDanger ? "bg-raport-danger-muted border-raport-danger-border hover:brightness-95" :
                          isWarning ? "bg-raport-warning-muted border-raport-warning-border hover:brightness-95" :
                          "bg-raport-surface border-raport-border hover:bg-raport-surface-soft"
                        }`}
                      >
                        {/* Accent left border for critical rows */}
                        {isDanger && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-raport-danger rounded-r-md" />}

                        {/* Index */}
                        <div className="hidden md:flex justify-center">
                          <span className={`text-xs font-extrabold font-mono ${isDanger ? 'text-raport-danger' : isWarning ? 'text-raport-warning' : 'text-raport-muted'}`}>
                            #{index + 1}
                          </span>
                        </div>

                        {/* Category */}
                        <div>
                          <div className="md:hidden text-[10px] font-bold text-raport-muted mb-1">#{index + 1}</div>
                          <button
                            type="button"
                            onClick={() => onCategorySelect?.(row.category)}
                            className={`font-extrabold text-left hover:underline text-sm leading-tight transition-colors block ${
                              isDanger ? "text-raport-danger" : isWarning ? "text-raport-warning" : "text-raport-text"
                            }`}
                            title={row.category}
                          >
                            {row.category}
                          </button>

                          {/* Mobile metrics */}
                          <div className="flex md:hidden items-center gap-3 mt-2 text-xs font-semibold">
                             <span className="text-raport-muted">{row.total} РІСЃРµРіРѕ</span>
                             {row.overdue > 0 && <span className="text-raport-danger font-bold">{row.overdue} РїСЂРѕСЃСЂРѕС‡.</span>}
                          </div>
                        </div>

                        {/* Total Drop */}
                        <div className="hidden md:flex flex-col items-center justify-center">
                          <span className={`${isDanger ? 'text-raport-danger mt-1' : isWarning ? 'text-raport-warning mt-1' : 'text-raport-muted'} text-sm font-bold leading-none`}>{row.total}</span>
                          <span className={`text-[10px] font-semibold mt-1 ${isDanger ? 'text-raport-danger' : isWarning ? 'text-raport-warning' : 'text-raport-muted'}`}>{getTicketWord(row.total)}</span>
                        </div>

                        {/* Overdue */}
                        <div className="hidden md:flex flex-col items-center justify-center">
                          <span className={`text-sm font-extrabold leading-none ${row.overdue > 0 ? (isDanger ? "text-raport-danger mt-1" : "text-raport-danger mt-1") : "text-raport-muted"}`}>{row.overdue}</span>
                          {row.overdue > 0 && <span className={`text-[10px] font-bold mt-1 uppercase ${isDanger ? 'text-raport-danger/80' : 'text-raport-danger'}`}>РЎР±РѕР№</span>}
                        </div>

                        {/* SLA Bar */}
                        <div className="flex flex-col justify-center gap-2 mt-1 md:mt-0">
                          <div className="flex items-center justify-between">
                             <span className={`text-sm font-extrabold tracking-tight tabular-nums ${
                                isDanger ? "text-raport-danger" : isWarning ? "text-raport-warning" : "text-raport-success"
                             }`}>
                               {formatSupportPercent(slaCompliance)}
                             </span>
                             {isDanger ? (
                               <Badge variant="danger" className="h-[18px] px-1.5 py-0 text-[9px]">РљСЂРёС‚РёС‡РЅРѕ</Badge>
                             ) : isWarning ? (
                                <Badge variant="warning" className="h-[18px] px-1.5 py-0 text-[9px]">Р РёСЃРє</Badge>
                             ) : (
                                <Badge variant="success" className="h-[18px] px-1.5 py-0 text-[9px]">РќРѕСЂРјР°</Badge>
                             )}
                          </div>
                           <div className={`relative h-2 w-full overflow-hidden rounded-full ${isDanger ? "bg-raport-danger-muted" : isWarning ? "bg-raport-warning-muted" : "bg-raport-progress-track"}`}>
                             <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${slaCompliance * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`absolute left-0 top-0 h-full rounded-full ${
                                  isDanger ? "bg-raport-danger" : isWarning ? "bg-raport-warning" : "bg-raport-success"
                                }`}
                             />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid gap-4"
              >
                {/* Legend / Instructions */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-raport-border bg-raport-surface-soft p-3 text-xs font-semibold text-raport-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-3 rounded-full bg-raport-primary" />
                    <span><strong>Р”РѕР»СЏ РІ РїРѕС‚РѕРєРµ:</strong> РґРѕР»СЏ РєР°С‚РµРіРѕСЂРёРё РІ РѕР±С‰РµРј РѕР±СЉС‘РјРµ РІС…РѕРґСЏС‰РёС… РѕР±СЂР°С‰РµРЅРёР№ РЅР° С„РѕРЅРµ СЃР°РјРѕРіРѕ РєСЂСѓРїРЅРѕРіРѕ РёСЃС‚РѕС‡РЅРёРєР°</span>
                  </div>
                </div>

                {/* Grid of SLA cards by topic */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedRows.map((row, index) => {
                    const violationT = row.violationRate;
                    const slaCompliance = 1 - violationT;
                    const isHighImpact = violationT >= 0.4;
                    const isRiskZone = violationT >= 0.2 && violationT < 0.4;

                    return (
                      <motion.article
                        key={row.category}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 flex flex-col justify-between ${
                          isHighImpact
                            ? "border-raport-danger-border bg-raport-danger-muted shadow-sm"
                            : isRiskZone
                            ? "border-raport-warning-border bg-raport-warning-muted"
                            : "border-raport-border bg-raport-surface hover:bg-raport-surface-soft"
                        }`}
                      >
                        {/* Visual warning indicator for high violation rates */}
                        {isHighImpact && (
                          <div className="absolute right-0 top-0 h-1.5 w-16 bg-raport-danger rounded-bl-lg" />
                        )}

                        <div>
                          {/* Title & Badge */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <button
                                type="button"
                                className="block text-base font-extrabold text-raport-primary hover:underline text-left leading-tight"
                                title={row.category}
                                onClick={() => onCategorySelect?.(row.category)}
                              >
                                {row.category}
                              </button>

                              <div className="mt-1 flex items-center gap-1 text-xs text-raport-muted font-semibold">
                                <span>{row.total} {getTicketWord(row.total)}</span>
                                {row.overdue > 0 && (
                                  <>
                                    <span>В·</span>
                                    <span className="text-raport-danger font-bold">{row.overdue} РїСЂРѕСЃСЂРѕС‡РµРЅРѕ</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Top-right prominent KPI: SLA Compliance rate */}
                            <div className="text-right shrink-0">
                              <span className={`block text-2xl font-extrabold tracking-tight tabular-nums leading-none ${
                                slaCompliance >= 0.95
                                  ? "text-raport-success"
                                  : slaCompliance >= 0.8
                                  ? "text-raport-warning"
                                  : "text-raport-danger"
                              }`}>
                                {formatSupportPercent(slaCompliance)}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-raport-muted mt-0.5 block">
                                РІС‹РїРѕР»РЅРµРЅРёРµ SLA
                              </span>
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex gap-2 mb-4">
                            {isHighImpact ? (
                              <Badge variant="danger" className="flex items-center gap-1 text-[10px]  py-0.5">
                                <Flame className="h-3 w-3" />
                                РљСЂРёС‚РёС‡РµСЃРєР°СЏ Р·РѕРЅР°
                              </Badge>
                            ) : isRiskZone ? (
                              <Badge variant="warning" className="flex items-center gap-1 font-bold text-[10px] py-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                Р—РѕРЅР° СЂРёСЃРєР°
                              </Badge>
                            ) : (
                              <Badge variant="success" className="flex items-center gap-1 font-bold text-[10px] bg-raport-success text-white border-0 py-0.5">
                                <CheckCircle className="h-3 w-3" />
                                РќРѕСЂРјР°
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Meter for share of incoming stream */}
                        <div className="space-y-2 pt-3 border-t border-raport-border mt-auto">
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
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </SectionCard>
  );
}
