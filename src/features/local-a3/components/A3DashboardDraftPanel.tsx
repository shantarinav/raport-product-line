import { ClipboardList, EyeOff, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { LocalA3DraftInput } from "../localA3Commands";
import { IconActionButton, SectionCard } from "../../../shared/ui";
import { LocalA3ProtocolEditor } from "./LocalA3ProtocolEditor";

type A3DashboardDraftPanelProps = {
  draft: LocalA3DraftInput;
  onRefreshDraft?: () => void;
  onClose: () => void;
  onSaved?: () => void;
  extraActions?: ReactNode;
};

export function A3DashboardDraftPanel({ draft, onRefreshDraft, onClose, onSaved, extraActions }: A3DashboardDraftPanelProps) {
  return (
    <SectionCard
      title="A3-разбор отклонения"
      description="Заполните причину, решение, исполнителя и срок."
      Icon={ClipboardList}
      actions={
        <>
          {extraActions}
          {onRefreshDraft ? (
            <IconActionButton
              onClick={onRefreshDraft}
              title="Обновить A3-разбор по текущим данным"
              aria-label="Обновить A3-разбор по текущим данным"
            >
              <RefreshCcw className="h-4 w-4" strokeWidth={2} />
            </IconActionButton>
          ) : null}
          <IconActionButton onClick={onClose} title="Скрыть A3-разбор" aria-label="Скрыть A3-разбор">
            <EyeOff className="h-4 w-4" strokeWidth={2} />
          </IconActionButton>
        </>
      }
    >
      <LocalA3ProtocolEditor key={draft.createdFromDashboardAt ?? "a3-draft"} initialDraft={draft} variant="compact" onSaved={onSaved} />
    </SectionCard>
  );
}
