import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

type IconLabelProps = {
  Icon: LucideIcon;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
};

export function IconLabel({ Icon, children, className, iconClassName }: IconLabelProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4 text-[var(--raport-primary)]", iconClassName)} strokeWidth={2} />
      {children}
    </span>
  );
}
