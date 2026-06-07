import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  default:
    "border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] text-[var(--raport-primary)] hover:bg-[var(--raport-action-bg-active)]",
  outline:
    "border border-[var(--raport-border)] bg-[var(--raport-surface)] text-[var(--raport-text)] hover:bg-[var(--raport-surface-soft)]",
  ghost: "border border-transparent bg-transparent text-[var(--raport-muted)] hover:bg-[var(--raport-surface-soft)]",
  destructive: "border border-[var(--raport-danger-border)] bg-[var(--raport-danger-muted)] text-[var(--raport-danger)] hover:brightness-95",
};

export function Button({ variant = "default", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--raport-radius-control)] px-3 py-2 text-sm font-semibold transition-colors",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
