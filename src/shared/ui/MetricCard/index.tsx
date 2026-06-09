import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../shadcn/card";
import { cn } from "../cn";

type MetricTone = "neutral" | "success" | "warning" | "danger";

type MetricCardProps = {
  label: string;
  value: string;
  valueAddon?: ReactNode;
  note?: ReactNode;
  Icon?: LucideIcon;
  tone?: MetricTone;
  className?: string;
};

const toneClass: Record<MetricTone, string> = {
  neutral: "border-t-raport-neutral",
  success: "border-t-raport-success",
  warning: "border-t-raport-warning",
  danger: "border-t-raport-danger",
};

export function MetricCard({ label, value, valueAddon, note, Icon, tone = "neutral", className }: MetricCardProps) {
  return (
    <Card className={cn("border-t-4", toneClass[tone], className)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-raport-muted">
          {Icon ? <Icon className="h-4 w-4 text-raport-primary" strokeWidth={2} /> : null}
          <span>{label}</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <strong className="block text-3xl font-extrabold leading-none text-raport-text">{value}</strong>
          {valueAddon}
        </div>
        {note ? <div className="mt-2 text-xs font-semibold text-raport-muted">{note}</div> : null}
      </CardContent>
    </Card>
  );
}
