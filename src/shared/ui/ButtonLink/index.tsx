import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../cn";

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
};

export function ButtonLink({ children, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-raport-action-border bg-raport-action-bg px-3 py-2 text-sm font-semibold text-raport-primary transition-colors hover:bg-raport-action-bg-active",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
