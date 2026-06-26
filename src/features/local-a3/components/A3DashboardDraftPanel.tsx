import { ClipboardList, EyeOff, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { LocalA3DraftInput } from "../localA3Commands";
import { SectionCard } from "../../../shared/ui";
import { Button } from "../../../shared/ui/shadcn/button";
import { LocalA3ProtocolEditor } from "./LocalA3ProtocolEditor";

type A3DashboardDraftPanelProps = {
  draft: LocalA3DraftInput;
  onRefreshDraft?: () => void;
  onClose: () => void;
  onSaved?: () => void;
  extraActions?: ReactNode;
};

const ICON_BUTTON_CLASS = "h-9 w-9 shrink-0 px-0 py-0 border-raport-action-border bg-raport-action-bg text-raport-primary hover:bg-raport-action-bg-active";

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
            <Button
              className={ICON_BUTTON_CLASS}
              onClick={onRefreshDraft}
              title="Обновить A3-разбор по текущим данным"
              aria-label="Обновить A3-разбор по текущим данным"
            >
              <RefreshCcw className="h-4 w-4" strokeWidth={2} />
            </Button>
          ) : null}
          <Button className={ICON_BUTTON_CLASS} onClick={onClose} title="Скрыть A3-разбор" aria-label="Скрыть A3-разбор">
            <EyeOff className="h-4 w-4" strokeWidth={2} />
          </Button>
        </>
      }
    >
      <LocalA3ProtocolEditor key={draft.createdFromDashboardAt ?? "a3-draft"} initialDraft={draft} variant="compact" onSaved={onSaved} />
    </SectionCard>
  );
}
