import type { ReactNode } from "react";
import { ThemeToggle } from "../../../theme/ThemeToggle";
import { cn } from "../cn";
import { Card, CardDescription, CardHeader, CardTitle } from "../shadcn/card";

type DashboardHeaderProps = {
  title: ReactNode;
  slogan?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function DashboardHeader({ title, slogan, description, actions, className }: DashboardHeaderProps) {
  return (
    <Card className={cn("mb-4", className)}>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <CardTitle className="text-2xl font-extrabold text-[var(--raport-text)] md:text-3xl">{title}</CardTitle>
          {slogan ? <p className="mt-2 text-sm font-bold text-[var(--raport-primary)]">{slogan}</p> : null}
          {description ? <CardDescription className="mt-2 max-w-3xl leading-relaxed">{description}</CardDescription> : null}
        </div>
        <div className="flex w-full shrink-0 items-start justify-end gap-2 sm:w-auto sm:max-w-[560px]">
          {actions}
          <ThemeToggle />
        </div>
      </CardHeader>
    </Card>
  );
}
