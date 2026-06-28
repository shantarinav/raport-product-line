import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

type DashboardHeaderMarkProps = {
  Icon: LucideIcon;
  className?: string;
};

export function DashboardHeaderMark({ Icon, className }: DashboardHeaderMarkProps) {
  return (
    <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm", className)}>
      <Icon className="h-6 w-6" strokeWidth={2.3} />
    </span>
  );
}
