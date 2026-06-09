import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-h-9 rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-sm text-raport-text placeholder:text-raport-muted focus:border-raport-action-border focus:outline-none focus:ring-2 focus:ring-raport-action-bg-active",
        className,
      )}
      {...props}
    />
  );
}
