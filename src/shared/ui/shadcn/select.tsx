import type { SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full min-h-9 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface)] px-3 py-2 text-sm text-[var(--raport-text)] focus:border-[var(--raport-action-border)] focus:outline-none focus:ring-2 focus:ring-[var(--raport-action-bg-active)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
