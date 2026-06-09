import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  default:
    "border border-raport-action-border bg-raport-action-bg text-raport-primary hover:bg-raport-action-bg-active",
  outline:
    "border border-raport-border bg-raport-surface text-raport-text hover:bg-raport-surface-soft",
  ghost: "border border-transparent bg-transparent text-raport-muted hover:bg-raport-surface-soft",
  destructive: "border border-raport-danger-border bg-raport-danger-muted text-raport-danger hover:brightness-95",
};

export function Button({ variant = "default", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-semibold transition-colors",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
