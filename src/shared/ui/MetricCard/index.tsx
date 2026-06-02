import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../shadcn/card";
import { cn } from "../cn";

type MetricTone = "neutral" | "success" | "warning" | "danger";

type MetricCardProps = {
  label: string;
  value: string;
  note?: string;
  Icon?: LucideIcon;
  tone?: MetricTone;
  className?: string;
};

const toneClass: Record<MetricTone, string> = {
  neutral: "border-t-[var(--raport-neutral)]",
  success: "border-t-[var(--raport-success)]",
  warning: "border-t-[var(--raport-warning)]",
  danger: "border-t-[var(--raport-danger)]",
};

export function MetricCard({ label, value, note, Icon, tone = "neutral", className }: MetricCardProps) {
  return (
    <Card className={cn("border-t-4", toneClass[tone], className)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-[var(--raport-muted)]">
          {Icon ? <Icon className="h-4 w-4 text-[var(--raport-primary)]" strokeWidth={2} /> : null}
          <span>{label}</span>
        </div>
        <strong className="block text-3xl font-extrabold leading-none text-[var(--raport-text)]">{value}</strong>
        {note ? <p className="mt-2 text-xs font-semibold text-[var(--raport-muted)]">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
