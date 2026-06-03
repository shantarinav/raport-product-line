import { FilterPanel } from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { SUPPORT_CATEGORY_ORDER, SUPPORT_PLAN_BUCKETS, SUPPORT_SLA_STATUSES } from "../supportConfig";
import type { SupportFilters } from "../supportTypes";

export function SupportFiltersPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: SupportFilters;
  onChange: (patch: Partial<SupportFilters>) => void;
  onReset: () => void;
}) {
  return (
    <FilterPanel onReset={onReset}>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-[var(--raport-muted)]">Период создания с</span>
          <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ dateFrom: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[var(--raport-muted)]">Период создания по</span>
          <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ dateTo: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[var(--raport-muted)]">SLA-статус</span>
          <Select value={filters.slaStatus} onChange={(event) => onChange({ slaStatus: event.target.value as SupportFilters["slaStatus"] })}>
            <option value="">Все</option>
            {SUPPORT_SLA_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[var(--raport-muted)]">Плановый срок SLA</span>
          <Select value={filters.planBucket} onChange={(event) => onChange({ planBucket: event.target.value as SupportFilters["planBucket"] })}>
            <option value="">Все сроки</option>
            {SUPPORT_PLAN_BUCKETS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>{bucket.value}</option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[var(--raport-muted)]">Тема обращения</span>
          <Select value={filters.category} onChange={(event) => onChange({ category: event.target.value as SupportFilters["category"] })}>
            <option value="">Все темы</option>
            {SUPPORT_CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[var(--raport-muted)]">Поиск</span>
          <Input value={filters.query} placeholder="№ заявки или текст темы" onChange={(event) => onChange({ query: event.target.value })} />
        </label>
      </div>
    </FilterPanel>
  );
}
