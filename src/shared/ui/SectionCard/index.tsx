import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../shadcn/card";
import { cn } from "../cn";

type SectionCardProps = {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  actions?: ReactNode;
  actionsClassName?: string;
  pinActionsRight?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
};

export function SectionCard({
  title,
  description,
  Icon,
  actions,
  actionsClassName,
  pinActionsRight,
  children,
  className,
  headerClassName,
}: SectionCardProps) {
  const hasActions = Boolean(actions);

  return (
    <Card className={className}>
      <CardHeader className={cn("pb-3", headerClassName)}>
        <div
          className={cn(
            "min-w-0 w-full",
            hasActions && !pinActionsRight && "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2",
            hasActions && pinActionsRight && "relative pr-32",
          )}
        >
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              {Icon ? <Icon className="h-5 w-5 text-[var(--raport-primary)]" strokeWidth={2} /> : null}
              <span>{title}</span>
            </CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>
          {actions ? (
            <div
              className={cn(
                "flex w-full flex-wrap items-center justify-end gap-2 justify-self-end",
                pinActionsRight && "absolute right-0 top-0 w-auto",
                actionsClassName,
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-0")}>{children}</CardContent>
    </Card>
  );
}
