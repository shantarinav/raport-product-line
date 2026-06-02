import { ToggleGroup } from "../shadcn/toggle-group";

type DashboardSwitchOption = {
  value: string;
  label: string;
};

type DashboardSwitchProps = {
  label?: string;
  value: string;
  options: DashboardSwitchOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function DashboardSwitch({ label, value, options, onChange, className }: DashboardSwitchProps) {
  return (
    <div className={className}>
      {label ? <p className="mb-1 text-xs font-semibold text-[var(--raport-muted)]">{label}</p> : null}
      <ToggleGroup value={value} onValueChange={onChange} options={options} />
    </div>
  );
}
