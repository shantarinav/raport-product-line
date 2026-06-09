import { useState } from "react";
import { SectionCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import type { SupportTopicSlaStat } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Layers, Flame, CheckCircle, AlertTriangle, LayoutGrid, Table2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function getTicketWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заявка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки";
  return "заявок";
}

interface SupportTopicSlaChartProps {
  rows: SupportTopicSlaStat[];
  onCategorySelect?: (category: SupportTopicSlaStat["category"]) => void;
}

export function SupportTopicSlaChart({ rows, onCategorySelect }: SupportTopicSlaChartProps) {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Calculate total volume to compute "Share in поток"
  const totalVolume = rows.reduce((sum, row) => sum + row.total, 0);
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));

  // Sort rows: first show categories with worse SLA compliance (higher violation rate)
  // to highlight potential SLA trouble spots at the top.
  const sortedRows = [...rows].sort((a, b) => b.violationRate - a.violationRate || b.total - a.total);

  return (
    <SectionCard 
      title="SLA по темам" 
      description="Уровень соблюдения соглашения об уровне услуг (SLA) и интенсивность обращений по категориям." 
      Icon={Layers}
      actions={
        <div className="flex items-center gap-1.5 rounded-lg border border-raport-border bg-raport-surface-soft p-0.5">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-205 ${
              viewMode === "table"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-raport-muted hover:text-slate-800"
            }`}
            title="Классическая таблица"
          >
            <Table2 className="h-3.5 w-3.5" />
            <span>Таблица</span>
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-205 ${
              viewMode === "cards"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-raport-muted hover:text-slate-800"
            }`}
            title="Интерактивные карточки"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Карты</span>
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        {sortedRows.length === 0 ? (
          <p className="text-sm text-raport-muted py-4 text-center font-semibold">Нет данных по выбранным фильтрам.</p>
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
                <div className="hidden md:grid grid-cols-[40px_3fr_1fr_1fr_2fr] gap-4 px-4 pb-3 text-[10px] font-extrabold text-raport-muted uppercase tracking-wider border-b border-slate-100 mb-3">
                  <div className="text-center">№</div>
                  <div>Тема / Категория</div>
                  <div className="text-center">Всего заявок</div>
                  <div className="text-center">Просрочено</div>
                  <div>Выполнение SLA</div>
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
                          isDanger ? "bg-red-50/40 border-red-200 hover:border-red-300 hover:bg-red-50/60 hover:shadow-sm" :
                          isWarning ? "bg-amber-50/20 border-amber-200 hover:border-amber-300 hover:bg-amber-50/40 hover:shadow-sm" :
                          "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Accent left border for critical rows */}
                        {isDanger && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-r-md" />}

                        {/* Index */}
                        <div className="hidden md:flex justify-center">
                          <span className={`text-xs font-extrabold font-mono ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-300'}`}>
                            #{index + 1}
                          </span>
                        </div>

                        {/* Category */}
                        <div>
                          <div className="md:hidden text-[10px] font-bold text-slate-400 mb-1">#{index + 1}</div>
                          <button
                            type="button"
                            onClick={() => onCategorySelect?.(row.category)}
                            className={`font-extrabold text-left hover:underline text-sm leading-tight transition-colors block ${
                              isDanger ? "text-red-900" : isWarning ? "text-amber-900" : "text-slate-900"
                            }`}
                            title={row.category}
                          >
                            {row.category}
                          </button>
                          
                          {/* Mobile metrics */}
                          <div className="flex md:hidden items-center gap-3 mt-2 text-xs font-semibold">
                             <span className="text-slate-600">{row.total} всего</span>
                             {row.overdue > 0 && <span className="text-red-600 font-bold">{row.overdue} просроч.</span>}
                          </div>
                        </div>

                        {/* Total Drop */}
                        <div className="hidden md:flex flex-col items-center justify-center">
                          <span className={`${isDanger ? 'text-red-950 mt-1' : isWarning ? 'text-amber-950 mt-1' : 'text-slate-700'} text-sm font-bold leading-none`}>{row.total}</span>
                          <span className={`text-[10px] font-semibold mt-1 ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-500/80' : 'text-slate-400'}`}>{getTicketWord(row.total)}</span>
                        </div>

                        {/* Overdue */}
                        <div className="hidden md:flex flex-col items-center justify-center">
                          <span className={`text-sm font-extrabold leading-none ${row.overdue > 0 ? (isDanger ? "text-red-600 mt-1" : "text-red-500 mt-1") : "text-slate-300"}`}>{row.overdue}</span>
                          {row.overdue > 0 && <span className={`text-[10px] font-bold mt-1 uppercase ${isDanger ? 'text-red-500/80' : 'text-red-400'}`}>Сбой</span>}
                        </div>

                        {/* SLA Bar */}
                        <div className="flex flex-col justify-center gap-2 mt-1 md:mt-0">
                          <div className="flex items-center justify-between">
                             <span className={`text-sm font-extrabold tracking-tight tabular-nums ${
                                isDanger ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                             }`}>
                               {formatSupportPercent(slaCompliance)}
                             </span>
                             {isDanger ? (
                               <Badge variant="danger" className="text-[9px] px-1.5 py-0 bg-red-600 border-0 h-[18px]">Критично</Badge>
                             ) : isWarning ? (
                               <Badge variant="warning" className="text-[9px] px-1.5 py-0 bg-amber-500 border-0 h-[18px] text-white">Риск</Badge>
                             ) : (
                               <Badge variant="success" className="text-[9px] px-1.5 py-0 bg-emerald-500 border-0 h-[18px]">Норма</Badge>
                             )}
                          </div>
                          <div className={`relative h-2 w-full rounded-full overflow-hidden ${isDanger ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-slate-100'}`}>
                             <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${slaCompliance * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`absolute left-0 top-0 h-full rounded-full ${
                                  isDanger ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-emerald-500"
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
                    <span className="h-1.5 w-3 rounded-full bg-blue-500" />
                    <span><strong>Доля в потоке:</strong> доля категории в общем объёме входящих обращений на фоне самого крупного источника</span>
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
                            ? "border-red-300 bg-red-50/10 shadow-sm ring-1 ring-red-500/10" 
                            : isRiskZone
                            ? "border-amber-300 bg-amber-50/10"
                            : "border-raport-border bg-white hover:border-slate-400 hover:shadow-sm"
                        }`}
                      >
                        {/* Visual warning indicator for high violation rates */}
                        {isHighImpact && (
                          <div className="absolute right-0 top-0 h-1.5 w-16 bg-gradient-to-l from-red-500 to-rose-600 rounded-bl-lg" />
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
                                    <span>·</span>
                                    <span className="text-red-600 font-bold">{row.overdue} просрочено</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Top-right prominent KPI: SLA Compliance rate */}
                            <div className="text-right shrink-0">
                              <span className={`block text-2xl font-extrabold tracking-tight tabular-nums leading-none ${
                                slaCompliance >= 0.95 
                                  ? "text-emerald-600" 
                                  : slaCompliance >= 0.8 
                                  ? "text-amber-500" 
                                  : "text-red-600"
                              }`}>
                                {formatSupportPercent(slaCompliance)}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-raport-muted mt-0.5 block">
                                выполнение SLA
                              </span>
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex gap-2 mb-4">
                            {isHighImpact ? (
                              <Badge variant="danger" className="animate-pulse flex items-center gap-1 font-bold text-[10px] bg-red-600 text-white border-0 py-0.5">
                                <Flame className="h-3 w-3" />
                                Критическая зона
                              </Badge>
                            ) : isRiskZone ? (
                              <Badge variant="warning" className="flex items-center gap-1 font-bold text-[10px] bg-amber-500 text-white border-0 py-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                Зона риска
                              </Badge>
                            ) : (
                              <Badge variant="success" className="flex items-center gap-1 font-bold text-[10px] bg-emerald-600 text-white border-0 py-0.5">
                                <CheckCircle className="h-3 w-3" />
                                Норма
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Meter for share of incoming stream */}
                        <div className="space-y-2 pt-3 border-t border-slate-100/80 mt-auto">
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
                            <span className="w-12 text-right font-mono text-xs font-bold text-blue-750 shrink-0">
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
