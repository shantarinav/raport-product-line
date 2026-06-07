import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-h-9 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface)] px-3 py-2 text-sm text-[var(--raport-text)] placeholder:text-[var(--raport-muted)] focus:border-[var(--raport-action-border)] focus:outline-none focus:ring-2 focus:ring-[var(--raport-action-bg-active)]",
        className,
      )}
      {...props}
    />
  );
}
