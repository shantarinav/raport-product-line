import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-h-9 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2 text-sm text-[var(--raport-text)]",
        className,
      )}
      {...props}
    />
  );
}
