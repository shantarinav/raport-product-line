import { DashboardHeader, PageShell } from "../../../shared/ui";
import { LocalA3ProtocolEditor } from "../../../features/local-a3/components/LocalA3ProtocolEditor";

const DEMO_DRAFT = {
  dashboardType: "print" as const,
  dashboardTitle: "Рапорт Печать",
  periodLabel: "01.06.2026 - 24.06.2026",
  deviationTitle: "Высокая доля односторонней печати",
  metricName: "Односторонняя печать",
  actualValue: "60,8%",
  targetValue: "ниже 30%",
  deviationScale: "превышение 30,8 п.п.",
  sourceFileName: "paper-cut-2026-06.csv",
};

export function LocalA3EditorDevPage() {
  return (
    <PageShell>
      <DashboardHeader
        title="A3-разбор"
        slogan="Excel докладывает главное"
        description="Временный экран проверки локального редактора A3-протокола. Не подключен к рабочим дашбордам."
      />
      <LocalA3ProtocolEditor initialDraft={DEMO_DRAFT} />
    </PageShell>
  );
}