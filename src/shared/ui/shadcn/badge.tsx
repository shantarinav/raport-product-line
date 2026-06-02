import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variantClass: Record<BadgeVariant, string> = {
  default: "border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] text-[var(--raport-primary)]",
  secondary: "border border-slate-200 bg-slate-50 text-slate-600",
  success: "border border-green-200 bg-green-50 text-green-700",
  warning: "border border-amber-200 bg-amber-50 text-amber-700",
  danger: "border border-red-200 bg-red-50 text-red-700",
};

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variant = (props as { variant?: BadgeVariant }).variant ?? "default";
  const { variant: _variant, ...rest } = props as HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
        variantClass[variant],
        className,
      )}
      {...rest}
    />
  );
}
