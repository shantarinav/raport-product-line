import { X } from "lucide-react";
import { Badge } from "../shadcn/badge";
import { Card, CardContent } from "../shadcn/card";

type FilterChip = {
  label: string;
  tone?: "default" | "secondary";
  onRemove?: () => void;
};

type FilterStatusBarProps = {
  title?: string;
  chips: FilterChip[];
  className?: string;
};

export function FilterStatusBar({ title = "Активные фильтры", chips, className }: FilterStatusBarProps) {
  return (
    <Card className={className}>
      <CardContent className="flex min-h-12 flex-wrap items-center gap-2 !px-4 !py-3">
        <strong className="mr-1 text-xs font-semibold text-[var(--raport-text)]">{title}</strong>
        {chips.map((chip) => (
          <Badge key={chip.label} variant={chip.tone === "secondary" ? "secondary" : "default"}>
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
      </CardContent>
    </Card>
  );
}
