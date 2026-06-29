import { FilterPanel } from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { SUPPORT_CATEGORY_ORDER, SUPPORT_PLAN_BUCKETS, SUPPORT_SLA_STATUSES } from "../supportConfig";
import type { SupportFilters } from "../supportTypes";

function ControlTarget({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  function applyValue(nextValue: number) {
    onChange(Math.max(0, Math.min(90, Math.round(nextValue))));
  }

  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
      <Input
        type="number"
        min={0}
        max={90}
        value={value}
        className="min-h-10 !w-14 px-1 text-center text-base font-semibold"
        aria-label="Цель контроля SLA в процентах"
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
      <input
        type="range"
        min={0}
        max={90}
        step={5}
        value={value}
        className="h-2 w-full min-w-0 cursor-pointer accent-raport-primary"
        aria-label="Цель контроля SLA"
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
    </div>
  );
}

function clampDateInput(value: string, min: string, max: string): string {
  if (!value) return value;
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

export function SupportFiltersPanel({
  filters,
  dateMin,
  dateMax,
  onChange,
  onReset,
  priorityOptions = [],
  showAdvancedFilters = true,
}: {
  filters: SupportFilters;
  dateMin: string;
  dateMax: string;
  onChange: (patch: Partial<SupportFilters>) => void;
  onReset: () => void;
  priorityOptions?: string[];
  showAdvancedFilters?: boolean;
}) {
  return (
    <FilterPanel onReset={onReset}>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Цель контроля</span>
          <ControlTarget value={filters.controlPercent} onChange={(controlPercent) => onChange({ controlPercent })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Период создания с</span>
          <Input
            type="date"
            value={filters.dateFrom}
            min={dateMin}
            max={dateMax}
            onChange={(event) => onChange({ dateFrom: clampDateInput(event.target.value, dateMin, dateMax) })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Период создания по</span>
          <Input
            type="date"
            value={filters.dateTo}
            min={dateMin}
            max={dateMax}
            onChange={(event) => onChange({ dateTo: clampDateInput(event.target.value, dateMin, dateMax) })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">SLA-статус</span>
          <Select value={filters.slaStatus} onChange={(event) => onChange({ slaStatus: event.target.value as SupportFilters["slaStatus"] })}>
            <option value="">Все</option>
            {SUPPORT_SLA_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Тема обращения</span>
          <Select value={filters.category} onChange={(event) => onChange({ category: event.target.value as SupportFilters["category"] })}>
            <option value="">Все темы</option>
            {SUPPORT_CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>
        </label>
        {showAdvancedFilters ? (
          <>
            {priorityOptions.length > 0 ? (
              <label className="grid gap-1">
                <span className="text-xs text-raport-muted">Приоритет</span>
                <Select value={filters.priorityLabel} onChange={(event) => onChange({ priorityLabel: event.target.value })}>
                  <option value="">Все приоритеты</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </Select>
              </label>
            ) : null}
            <label className="grid gap-1">
              <span className="text-xs text-raport-muted">Плановый срок SLA</span>
              <Select value={filters.planBucket} onChange={(event) => onChange({ planBucket: event.target.value as SupportFilters["planBucket"] })}>
                <option value="">Все сроки</option>
                {SUPPORT_PLAN_BUCKETS.map((bucket) => (
                  <option key={bucket.value} value={bucket.value}>{bucket.value}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-raport-muted">Поиск</span>
              <Input value={filters.query} placeholder="№ заявки или текст темы" onChange={(event) => onChange({ query: event.target.value })} />
            </label>
          </>
        ) : null}
      </div>
    </FilterPanel>
  );
}
