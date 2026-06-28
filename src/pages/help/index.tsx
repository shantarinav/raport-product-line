import { Link } from "react-router-dom";
import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  Filter,
  Gauge,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import { DashboardHeader, PageShell, SectionCard } from "../../shared/ui";

const HEADER_ACTION_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary transition-colors hover:bg-raport-action-bg-active";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Загрузите отчет",
    description: "Перетащите Excel или CSV на главную. Рапорт сам определит тип отчета и откроет нужный дашборд.",
    Icon: UploadCloud,
  },
  {
    step: "02",
    title: "Найдите отклонение",
    description: "Начните с главного вывода, KPI и зоны внимания. Если нужно, уточните картину фильтрами.",
    Icon: Gauge,
  },
  {
    step: "03",
    title: "Поставьте на разбор",
    description: "Если проблема требует действий, нажмите «Разобрать», назначьте исполнителя и срок.",
    Icon: ClipboardList,
  },
];

const ROLE_CARDS = [
  {
    title: "Руководителю",
    description: "Смотрите главный вывод, KPI, зоны внимания и статус разборов. Цель — быстро понять, где требуется решение.",
    items: ["Главный вывод", "KPI и динамика", "Зоны внимания", "Открытые разборы"],
  },
  {
    title: "Аналитику",
    description: "Используйте фильтры, детализацию и A3-разборы, чтобы найти причину отклонения и подготовить действие.",
    items: ["Фильтры", "Детальные срезы", "Причины отклонений", "A3-разборы"],
  },
];

const EXTRA_FEATURES = [
  {
    title: "Разборы отклонений",
    description: "Локальный журнал проблем, ответственных, сроков и статусов.",
    Icon: BookOpen,
  },
  {
    title: "Резервная копия",
    description: "Сохранение и восстановление журнала разборов для переноса или страховки.",
    Icon: ShieldCheck,
  },
  {
    title: "ИИ для анализа печати",
    description: "Опция дашборда «Печать»: дополнительная проверка личной печати. Включается отдельно и не обязательна для работы.",
    Icon: Sparkles,
  },
];

export function HelpPage() {
  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <CircleHelp className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-slate-900 md:text-3xl">Как пользоваться Рапортом</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Как Excel докладывает главное</span>
            </div>
          </div>
        }
        description="От загрузки отчета до управленческого разбора отклонения: что смотреть, где уточнять и когда создавать A3-разбор."
        actions={(themeToggle) => (
          <div className="flex items-center justify-end gap-2">
            <Link to="/" title="На главную" aria-label="На главную" className={HEADER_ACTION_CLASS}>
              <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
            <Link to="/a3" title="Открыть журнал A3-разборов" aria-label="Открыть журнал A3-разборов" className={HEADER_ACTION_CLASS}>
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
            {themeToggle}
          </div>
        )}
      />

      <div className="grid gap-4">
        <SectionCard title="Рабочий сценарий" description="Три шага, которые закрывают большинство ежедневных задач." Icon={ShieldCheck}>
          <div className="grid gap-3 lg:grid-cols-3">
            {WORKFLOW_STEPS.map(({ step, title, description, Icon }) => (
              <div key={title} className="relative overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft p-5">
                <span className="absolute right-4 top-3 text-3xl font-extrabold text-raport-muted/20">{step}</span>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold text-raport-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-raport-muted">{description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Что смотреть в первую очередь" description="Один и тот же отчет можно читать по-разному: для решения или для анализа." Icon={Users}>
          <div className="grid gap-3 md:grid-cols-2">
            {ROLE_CARDS.map((role) => (
              <div key={role.title} className="rounded-control border border-raport-border bg-raport-surface-soft p-5">
                <h3 className="text-base font-bold text-raport-text">{role.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-raport-muted">{role.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {role.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex min-h-7 items-center rounded-full border border-raport-action-border bg-raport-action-bg px-3 py-1 text-xs font-bold text-raport-primary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <SectionCard title="Дополнительные возможности" description="Используйте, когда нужно перейти от просмотра к контролю действий." Icon={Filter}>
            <div className="grid gap-3 md:grid-cols-3">
              {EXTRA_FEATURES.map(({ title, description, Icon }) => (
                <div key={title} className="rounded-control border border-raport-border bg-raport-surface p-4">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <h3 className="text-sm font-bold text-raport-text">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-raport-muted">{description}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Начать работу" description="Две основные точки входа." Icon={PlayCircle}>
            <div className="grid gap-2">
              <Link
                to="/"
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-raport-action-border bg-raport-action-bg px-3 py-2 text-sm font-semibold text-raport-primary transition-colors hover:bg-raport-action-bg-active"
              >
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
                Загрузить отчет
              </Link>
              <Link
                to="/a3"
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-sm font-semibold text-raport-text transition-colors hover:bg-raport-surface-soft"
              >
                <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
                Открыть разборы
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-raport-muted">
              Файлы отчетов не сохраняются. Журнал разборов хранится в этом браузере, для переноса используйте резервную копию.
            </p>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
