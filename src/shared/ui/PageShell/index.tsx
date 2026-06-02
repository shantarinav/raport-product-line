import type { ReactNode } from "react";
import { cn } from "../cn";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return <main className={cn("mx-auto w-full max-w-[1760px] bg-[var(--raport-bg)] px-4 py-4 md:px-6", className)}>{children}</main>;
}
