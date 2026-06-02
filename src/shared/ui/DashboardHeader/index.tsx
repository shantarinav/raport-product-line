import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../shadcn/card";
import { cn } from "../cn";

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
        <div className="min-w-0">
          <CardTitle className="text-2xl font-extrabold text-slate-900 md:text-3xl">{title}</CardTitle>
          {slogan ? <p className="mt-2 text-sm font-bold text-[var(--raport-primary)]">{slogan}</p> : null}
          {description ? <CardDescription className="mt-2 max-w-3xl leading-relaxed">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-start gap-2">{actions}</div> : null}
      </CardHeader>
    </Card>
  );
}
