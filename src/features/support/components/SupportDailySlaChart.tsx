import { ChartCard } from "../../../shared/ui";
import type { SupportDailyPoint } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Activity } from "lucide-react";

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-raport-border bg-white px-2 py-1 text-xs font-semibold text-raport-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

export function SupportDailySlaChart({ points, controlPercent }: { points: SupportDailyPoint[]; controlPercent: number }) {
  const width = 920;
  const height = 300;
  const padding = { top: 34, right: 82, bottom: 54, left: 54 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const controlRatio = controlPercent / 100;
  const healthyRatio = 0.95;
  const maxTotal = Math.max(1, ...points.map((point) => point.total));
  const slotWidth = points.length > 0 ? innerWidth / points.length : 0;
  const barWidth = points.length > 0 ? Math.max(4, slotWidth - 4) : 0;
  const labelStep = points.length <= 8 ? 1 : Math.ceil(points.length / 8);
  const linePoints = points.map((point, index) => {
    const x = padding.left + slotWidth * index + slotWidth / 2;
    const y = padding.top + innerHeight - point.slaRate * innerHeight;
    return `${x},${y}`;
  });

  return (
    <ChartCard title="SLA по дням" description="Динамика нагрузки и выполнения SLA по датам создания заявок." Icon={Activity}>
      {points.length === 0 ? (
        <p className="text-sm text-raport-muted">Нет данных для построения графика.</p>
      ) : (
        <div className="grid gap-2 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft p-3">
          <p className="text-xs font-semibold text-raport-muted">
            Столбец — сколько заявок создано. Линия — доля выполненных SLA. Цвет столбца — уровень просрочек.
          </p>
          <div className="flex flex-wrap gap-2">
            <LegendItem className="bg-blue-600" label="Мало просрочек (<20%)" />
            <LegendItem className="bg-amber-500" label="Заметно просрочек (20–39%)" />
            <LegendItem className="bg-red-500" label="Много просрочек (≥40%)" />
            <LegendItem className="bg-raport-primary" label="SLA выполнен" />
            <LegendItem className="bg-emerald-500" label="Норма 95%" />
            <LegendItem className="bg-amber-500" label={`Контроль ${controlPercent}%`} />
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-[300px] w-full rounded-control bg-white">
            <text x={padding.left} y="18" className="fill-raport-muted text-[11px] font-bold">Заявки</text>
            <text x={width - padding.right} y="18" textAnchor="end" className="fill-raport-muted text-[11px] font-bold">SLA, %</text>
            <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} className="stroke-slate-200" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} className="stroke-slate-200" />
            <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="fill-raport-muted text-[10px] font-semibold">{maxTotal}</text>
            <text x={padding.left - 8} y={padding.top + innerHeight + 4} textAnchor="end" className="fill-raport-muted text-[10px] font-semibold">0</text>
            {[0.5, controlRatio, healthyRatio].filter((v, i, a) => a.indexOf(v) === i).map((ratio) => (
              <line
                key={ratio.toString()}
                x1={padding.left}
                y1={padding.top + innerHeight - ratio * innerHeight}
                x2={width - padding.right}
                y2={padding.top + innerHeight - ratio * innerHeight}
                className={ratio === healthyRatio ? "stroke-emerald-500" : ratio === controlRatio ? "stroke-amber-500" : "stroke-slate-200"}
                strokeDasharray="4 4"
              />
            ))}
            <text x={width - padding.right + 8} y={padding.top + innerHeight - healthyRatio * innerHeight + 4} className="fill-emerald-700 text-[10px] font-bold">95% норма</text>
            <text x={width - padding.right + 8} y={padding.top + innerHeight - controlRatio * innerHeight + 4} className="fill-amber-700 text-[10px] font-bold">{controlPercent}% контроль</text>
            {points.map((point, index) => {
              const x = padding.left + slotWidth * index + 2;
              const barHeight = (point.total / maxTotal) * innerHeight;
              const overdueRate = point.applicable > 0 ? point.overdue / point.applicable : 0;
              return (
                <g key={point.dateKey}>
                  <title>{`${point.label}\nВсего: ${point.total}\nС расчетом SLA: ${point.applicable}\nВ SLA: ${point.inSla}\nПросрочено: ${point.overdue}\nSLA: ${formatSupportPercent(point.slaRate)}`}</title>
                  <rect
                    x={x}
                    y={padding.top + innerHeight - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    className={overdueRate >= 0.4 ? "fill-red-500" : overdueRate >= 0.2 ? "fill-amber-500" : "fill-blue-600"}
                    opacity="0.82"
                  />
                  {index % labelStep === 0 || index === points.length - 1 ? (
                    <text
                      x={x + barWidth / 2}
                      y={height - 18}
                      textAnchor="middle"
                      className="fill-raport-muted text-[10px] font-semibold"
                    >
                      {point.label.slice(0, 5)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <polyline points={linePoints.join(" ")} fill="none" className="stroke-raport-primary" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => {
              const x = padding.left + slotWidth * index + slotWidth / 2;
              const y = padding.top + innerHeight - point.slaRate * innerHeight;
              return <circle key={`${point.dateKey}-dot`} cx={x} cy={y} r="4" className="fill-raport-primary stroke-raport-surface" strokeWidth="2" />;
            })}
          </svg>
        </div>
      )}
    </ChartCard>
  );
}
