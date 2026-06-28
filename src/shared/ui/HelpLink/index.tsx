import { CircleHelp } from "lucide-react";
import { HeaderIconButton } from "../HeaderIconButton";

type HelpLinkProps = {
  className?: string;
};

export function HelpLink({ className }: HelpLinkProps) {
  return (
    <HeaderIconButton to="/help" title="Как пользоваться Рапортом" className={className}>
      <CircleHelp className="h-4 w-4 shrink-0" strokeWidth={2} />
    </HeaderIconButton>
  );
}
