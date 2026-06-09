import type { ReactNode } from "react";
import { Filter, RefreshCcw } from "lucide-react";
import { Button } from "../shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "../shadcn/card";

type FilterPanelProps = {
  title?: string;
  subtitle?: string;
  onReset?: () => void;
  children: ReactNode;
  className?: string;
};

export function FilterPanel({
  title = "Фильтры",
  subtitle = "Поля применяются автоматически.",
  onReset,
  children,
  className,
}: FilterPanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-col items-stretch gap-2">
        <div className="flex w-full items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-raport-primary" strokeWidth={2} />
            {title}
          </CardTitle>
          {onReset ? (
            <Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={onReset}>
              <RefreshCcw className="h-4 w-4" strokeWidth={2} />
              Сбросить
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-raport-muted">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
