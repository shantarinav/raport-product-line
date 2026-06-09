import type { SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full min-h-9 rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-sm text-raport-text focus:border-raport-action-border focus:outline-none focus:ring-2 focus:ring-raport-action-bg-active",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
