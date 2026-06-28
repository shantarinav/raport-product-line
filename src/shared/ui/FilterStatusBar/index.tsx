import type { ReactNode } from "react";
import { X, Loader2 } from "lucide-react";
import { Badge } from "../shadcn/badge";
import { Card, CardContent } from "../shadcn/card";

type FilterChip = {
  label: string;
  tone?: "default" | "accent" | "secondary" | "warning" | "danger";
  isLoading?: boolean;
  onRemove?: () => void;
};

type FilterStatusBarProps = {
  title?: string;
  chips: FilterChip[];
  className?: string;
  actions?: ReactNode;
};

export function FilterStatusBar({ title = "Активные фильтры", chips, className, actions }: FilterStatusBarProps) {
  return (
    <Card className={className}>
      <CardContent className="flex min-h-12 flex-wrap items-center justify-between gap-3 !px-4 !py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <strong className="mr-1 text-xs font-semibold text-raport-text">{title}</strong>
          {chips.map((chip) => (
            <Badge key={chip.label} variant={chip.tone ?? "accent"} className={chip.isLoading ? "pl-2" : ""}>
              {chip.isLoading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
              {chip.label}
              {chip.onRemove ? (
                <button
                  type="button"
                  aria-label={`Убрать фильтр ${chip.label}`}
                  className="ml-1 inline-flex rounded-full p-0.5 hover:bg-white/70"
                  onClick={chip.onRemove}
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
