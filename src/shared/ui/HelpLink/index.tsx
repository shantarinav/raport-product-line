import { CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../cn";

type HelpLinkProps = {
  className?: string;
};

export function HelpLink({ className }: HelpLinkProps) {
  return (
    <Link
      to="/help"
      title="Как пользоваться Рапортом"
      aria-label="Как пользоваться Рапортом"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary transition-colors hover:bg-raport-action-bg-active",
        className,
      )}
    >
      <CircleHelp className="h-4 w-4 shrink-0" strokeWidth={2} />
    </Link>
  );
}
