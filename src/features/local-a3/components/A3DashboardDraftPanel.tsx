import { ClipboardList, EyeOff, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsHighlighted(true);
    const timeoutId = window.setTimeout(() => setIsHighlighted(false), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [draft.createdFromDashboardAt]);

  return (
    <div
      ref={panelRef}
      className={isHighlighted ? "rounded-card ring-2 ring-raport-primary/35 ring-offset-2 ring-offset-raport-page transition-shadow duration-500" : "transition-shadow duration-500"}
    >
      <SectionCard
        title="A3-разбор отклонения"
        description="Заполните проблему, причину, действие и проверку результата."
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
        <LocalA3ProtocolEditor key={draft.createdFromDashboardAt ?? "a3-draft"} initialDraft={draft} variant="compact" onSaved={onSaved} autoFocusFirstField />
      </SectionCard>
    </div>
  );
}
