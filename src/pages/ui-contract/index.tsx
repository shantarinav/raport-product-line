import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleX,
  FileSpreadsheet,
  Filter,
  Gauge,
  Info,
  ListChecks,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import {
  DashboardHeader,
  DashboardHeaderMark,
  DashboardSwitch,
  FilterStatusBar,
  HeaderIconButton,
  MetricCard,
  PageShell,
  QuickFocusGroup,
  SectionCard,
} from "../../shared/ui";
import { Badge } from "../../shared/ui/shadcn/badge";
import { Button } from "../../shared/ui/shadcn/button";
import { Card, CardContent } from "../../shared/ui/shadcn/card";
import { Input } from "../../shared/ui/shadcn/input";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../shared/ui/shadcn/table";

const badgeSamples = [
  { label: "нейтрально", variant: "default" as const },
  { label: "активный фильтр", variant: "accent" as const },
  { label: "норма", variant: "success" as const },
  { label: "контроль", variant: "warning" as const },
  { label: "критично", variant: "danger" as const },
];

const dashboardRows = [
  { area: "Цех 400", status: "Контроль", value: "62,8 п.п.", tone: "warning" as const },
  { area: "Заказ 2006024", status: "Критично", value: "93,8%", tone: "danger" as const },
  { area: "Мастер", status: "Норма", value: "86,0%", tone: "success" as const },
];

export function UiContractPage() {
  return (
    <PageShell>
      <DashboardHeader
        title={
          <div className="flex items-center gap-3">
            <DashboardHeaderMark Icon={Gauge} />
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-raport-text md:text-3xl">Visual Contract</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Эталон интерфейса Рапорта</span>
            </div>
          </div>
        }
        description="Внутренняя страница для проверки кнопок, пинов, карточек, таблиц и шапок в светлой и темной теме."
        actions={(themeToggle) => (
          <div className="flex items-center justify-end gap-2">
            <HeaderIconButton to="/" title="На главную">
              <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton to="/help" title="Открыть справку">
              <Info className="h-4 w-4 shrink-0" strokeWidth={2} />
            </HeaderIconButton>
            {themeToggle}
          </div>
        )}
      />

      <div className="grid gap-4">
        <SectionCard
          title="Цветовая семантика"
          description="Синий — действие и активность. Серый — справочная информация. Зеленый, янтарный и красный — только смысловые статусы."
          Icon={Info}
        >
          <div className="flex flex-wrap gap-2">
            {badgeSamples.map((sample) => (
              <Badge key={sample.label} variant={sample.variant}>
                {sample.label}
              </Badge>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Кнопки и действия"
          description="Кнопки должны отличаться от пинов: у действия есть рамка, фон, hover-state и понятная иконка."
          Icon={ListChecks}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
              Заменить отчет
            </Button>
            <Button variant="outline">
              <RefreshCcw className="h-4 w-4" strokeWidth={2} />
              Обновить
            </Button>
            <Button variant="ghost">Вторичное</Button>
            <Button variant="destructive">
              <CircleX className="h-4 w-4" strokeWidth={2} />
              Удалить
            </Button>
            <HeaderIconButton title="Иконка-действие">
              <BarChart3 className="h-4 w-4" strokeWidth={2} />
            </HeaderIconButton>
          </div>
        </SectionCard>

        <FilterStatusBar
          title="Активные фильтры"
          chips={[
            { label: "Режим: Аналитик", tone: "accent" },
            { label: "Цех: 400", tone: "accent" },
            { label: "Справочно: 12 строк", tone: "default" },
            { label: "Контроль", tone: "warning" },
          ]}
          actions={
            <DashboardSwitch
              options={[
                { label: "Риск", value: "risk" },
                { label: "Страницы", value: "pages" },
              ]}
              value="risk"
              onChange={() => undefined}
            />
          }
        />

        <SectionCard
          title="Быстрый фокус"
          description="Для быстрых фильтров использовать общий QuickFocusGroup: активные состояния берутся из смысловых токенов."
          Icon={Filter}
        >
          <div className="max-w-xl">
            <QuickFocusGroup
              label="Быстрый фокус"
              value="warning"
              options={[
                { value: "all", label: "Все" },
                { value: "warning", label: "Контроль", tone: "warning", count: 12 },
                { value: "danger", label: "Критично", tone: "danger", count: 4 },
                { value: "success", label: "Норма", tone: "success", count: 28 },
              ]}
              onChange={() => undefined}
              columnsClassName="grid-cols-2"
              showCurrent
              currentLabel="Контроль"
            />
          </div>
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Всего страниц" value="101 680" note="нейтральный KPI" Icon={FileSpreadsheet} />
          <MetricCard label="Доля по технологии" value="72,4%" note="ниже цели" Icon={Gauge} tone="warning" />
          <MetricCard label="Выполнено" value="95,2%" note="норма" Icon={CheckCircle2} tone="success" />
          <MetricCard label="Просрочено" value="18" note="критично" Icon={AlertTriangle} tone="danger" />
        </div>

        <SectionCard title="Карточка с таблицей" description="Таблицы используют мягкие границы, спокойный фон и компактные статусы." Icon={FileSpreadsheet}>
          <div className="overflow-hidden rounded-control border border-raport-border">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Зона внимания</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell className="text-right">Отклонение</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardRows.map((row) => (
                  <TableRow key={row.area}>
                    <TableCell className="font-semibold text-raport-text">{row.area}</TableCell>
                    <TableCell>
                      <Badge variant={row.tone}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-raport-text">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard title="Формы и состояния" description="Поля ввода и сообщения должны быть спокойными, читаемыми и одинаковыми между страницами." Icon={ListChecks}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-raport-muted">
                Исполнитель
                <Input placeholder="ФИО или роль" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-raport-muted">
                Срок
                <Input type="date" />
              </label>
            </div>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 text-raport-muted" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-semibold text-raport-text">Справочное состояние</p>
                    <p className="mt-1 text-sm leading-relaxed text-raport-muted">
                      Декоративная иконка без рамки не конкурирует с кнопками и не выглядит кликабельной.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
