import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--raport-radius-card)] border border-[var(--raport-border)] bg-[var(--raport-surface)] px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={cn("mb-1 text-sm font-semibold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--raport-muted)]", className)} {...props} />;
}
