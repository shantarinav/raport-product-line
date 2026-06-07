import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variantClass: Record<BadgeVariant, string> = {
  default: "border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] text-[var(--raport-primary)]",
  secondary: "border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] text-[var(--raport-muted)]",
  success: "border border-[var(--raport-success-border)] bg-[var(--raport-success-muted)] text-[var(--raport-success)]",
  warning: "border border-[var(--raport-warning-border)] bg-[var(--raport-warning-muted)] text-[var(--raport-warning)]",
  danger: "border border-[var(--raport-danger-border)] bg-[var(--raport-danger-muted)] text-[var(--raport-danger)]",
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
