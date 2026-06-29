import type { LucideIcon } from "lucide-react";
import { SectionCard } from "../../../shared/ui";
import type { SupportQuantiles } from "../supportTypes";
import { formatSupportHours } from "../logic/supportMetrics";

const QUANTILE_KEYS: Array<{ key: keyof SupportQuantiles; label: string }> = [
  { key: "q1", label: "25%" },
  { key: "q2", label: "Медиана" },
  { key: "q3", label: "75%" },
  { key: "p90", label: "90%" },
];

export function SupportDistributionCard({
  title,
  description,
  explanation,
  quantiles,
  Icon,
}: {
  title: string;
  description: string;
  explanation?: string;
  quantiles: SupportQuantiles;
  Icon: LucideIcon;
}) {
  const values = QUANTILE_KEYS.map((item) => quantiles[item.key]).filter((value): value is number => value !== null && Number.isFinite(value));
  const max = Math.max(1, ...values);

  return (
    <SectionCard title={title} description={description} Icon={Icon}>
      <div className="grid gap-3">
        <div className="rounded-full bg-raport-progress-track px-2 py-2">
          <svg viewBox="0 0 100 12" className="h-5 w-full overflow-visible" aria-hidden="true">
            <line x1="0" y1="6" x2="100" y2="6" className="stroke-raport-border" strokeWidth="3" strokeLinecap="round" />
          {QUANTILE_KEYS.map((item) => {
            const value = quantiles[item.key];
            const x = value === null || !Number.isFinite(value) ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
            return (
              <circle
                key={item.key}
                cx={x}
                cy="6"
                r="4"
                className="fill-raport-primary stroke-raport-surface"
                strokeWidth="2"
              >
                <title>{`${item.label}: ${formatSupportHours(value)}`}</title>
              </circle>
            );
          })}
          </svg>
        </div>
        {explanation ? (
          <p className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs font-semibold text-raport-muted">
            {explanation}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-control border border-raport-border bg-raport-surface px-3 py-2">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-raport-muted">Медиана</span>
            <strong className="mt-1 block text-xl font-extrabold tabular-nums text-raport-text">{formatSupportHours(quantiles.q2)}</strong>
            <span className="text-xs font-semibold text-raport-muted">типичная заявка</span>
          </div>
          <div className="rounded-control border border-raport-border bg-raport-surface px-3 py-2">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-raport-muted">90% до</span>
            <strong className="mt-1 block text-xl font-extrabold tabular-nums text-raport-text">{formatSupportHours(quantiles.p90)}</strong>
            <span className="text-xs font-semibold text-raport-muted">длинный хвост</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs font-semibold text-raport-muted">
          <span>Детализация:</span>
          <span>25% до <strong className="text-raport-text">{formatSupportHours(quantiles.q1)}</strong></span>
          <span>75% до <strong className="text-raport-text">{formatSupportHours(quantiles.q3)}</strong></span>
        </div>
      </div>
    </SectionCard>
  );
}
