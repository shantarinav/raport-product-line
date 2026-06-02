import type { ImportedReport } from "../import/types";
import { RankingWidgets } from "./RankingWidgets";

interface DashboardPageProps {
  activeReport: ImportedReport;
}

export function DashboardPage({ activeReport }: DashboardPageProps) {
  return (
    <section className="dashboard-page">
      <RankingWidgets key={activeReport.sourceId} records={activeReport.sszRecords} period={activeReport.period} />
    </section>
  );
}
