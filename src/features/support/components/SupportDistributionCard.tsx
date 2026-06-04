import type { LucideIcon } from "lucide-react";
import { SectionCard } from "../../../shared/ui";
import type { SupportQuantiles } from "../supportTypes";
import { formatSupportHours } from "../logic/supportMetrics";

const QUANTILE_KEYS: Array<{ key: keyof SupportQuantiles; label: string }> = [
  { key: "q1", label: "Q1" },
  { key: "q2", label: "Q2" },
  { key: "q3", label: "Q3" },
  { key: "p90", label: "P90" },
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
        <div className="rounded-full bg-slate-100 px-2 py-2">
          <svg viewBox="0 0 100 12" className="h-5 w-full overflow-visible" aria-hidden="true">
            <line x1="0" y1="6" x2="100" y2="6" className="stroke-slate-200" strokeWidth="3" strokeLinecap="round" />
          {QUANTILE_KEYS.map((item) => {
            const value = quantiles[item.key];
            const x = value === null || !Number.isFinite(value) ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
            return (
              <circle
                key={item.key}
                cx={x}
                cy="6"
                r="4"
                className="fill-[var(--raport-primary)] stroke-white"
                strokeWidth="2"
              >
                <title>{`${item.label}: ${formatSupportHours(value)}`}</title>
              </circle>
            );
          })}
          </svg>
        </div>
        {explanation ? (
          <p className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--raport-muted)]">
            {explanation}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-4">
          {QUANTILE_KEYS.map((item) => (
            <div key={item.key} className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--raport-muted)]">{item.label}</span>
              <strong className="mt-1 block text-sm font-extrabold tabular-nums text-[var(--raport-text)]">{formatSupportHours(quantiles[item.key])}</strong>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
