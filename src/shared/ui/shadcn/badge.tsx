import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variantClass: Record<BadgeVariant, string> = {
  default: "border border-raport-action-border bg-raport-action-bg text-raport-primary",
  secondary: "border border-raport-border bg-raport-surface-soft text-raport-muted",
  success: "border border-raport-success-border bg-raport-success-muted text-raport-success",
  warning: "border border-raport-warning-border bg-raport-warning-muted text-amber-900",
  danger: "border border-raport-danger-border bg-raport-danger-muted text-raport-danger",
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
