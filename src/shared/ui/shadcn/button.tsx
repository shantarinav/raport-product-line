import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  default:
    "border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] text-[var(--raport-primary)] hover:bg-[var(--raport-action-bg-active)]",
  outline: "border border-[var(--raport-border)] bg-white text-[var(--raport-text)] hover:bg-slate-50",
  ghost: "border border-transparent bg-transparent text-[var(--raport-muted)] hover:bg-slate-100",
  destructive: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
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
