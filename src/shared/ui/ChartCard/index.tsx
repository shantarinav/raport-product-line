import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "../SectionCard";

type ChartCardProps = {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  children?: ReactNode;
  emptyText?: string;
  className?: string;
};

export function ChartCard({ title, description, Icon, children, emptyText = "Нет данных для отображения", className }: ChartCardProps) {
  return (
    <SectionCard title={title} description={description} Icon={Icon} className={className}>
      {children ?? <p className="text-sm text-raport-muted">{emptyText}</p>}
    </SectionCard>
  );
}
