import { FilePenLine } from "lucide-react";
import type { LocalA3DraftInput } from "../localA3Commands";
import { createA3DraftFromDeviation, type DashboardDeviation } from "../dashboardDeviation";
import { Button } from "../../../shared/ui/shadcn/button";
import { cn } from "../../../shared/ui/cn";

export type A3ReviewButtonProps = {
  deviation: DashboardDeviation | (() => DashboardDeviation);
  onCreateDraft: (draft: LocalA3DraftInput) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function A3ReviewButton({ deviation, onCreateDraft, label = "Разобрать", className, disabled }: A3ReviewButtonProps) {
  function handleClick() {
    const resolvedDeviation = typeof deviation === "function" ? deviation() : deviation;
    onCreateDraft(createA3DraftFromDeviation(resolvedDeviation));
  }

  return (
    <Button
      className={cn("min-h-9", className)}
      disabled={disabled}
      onClick={handleClick}
      title="Создать A3-разбор по этому отклонению"
      aria-label="Создать A3-разбор по этому отклонению"
    >
      <FilePenLine className="h-4 w-4" strokeWidth={2} />
      {label}
    </Button>
  );
}
