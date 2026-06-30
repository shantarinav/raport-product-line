import {
  BookOpen,
  CircleHelp,
  Compass,
  Filter,
  Gauge,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ButtonLink, DashboardHeader, DashboardHeaderMark, HeaderIconButton, PageShell, SectionCard } from "../../shared/ui";

const EXTRA_FEATURES = [
  {
    title: "ИИ-помощник",
    description: "Включает подсказки ИИ там, где они поддержаны: уточнение личной печати в дашборде «Печать» и черновики формулировок в A3-разборе. Если сервис недоступен, Рапорт работает без ИИ.",
    Icon: Sparkles,
  },
  {
    title: "Сбор трендов",
    description: "Сохраняет месячные KPI для динамики показателей. Исходные строки отчета при этом не сохраняются.",
    Icon: Gauge,
  },
  {
    title: "История и резервная копия",
    description: "Показывает сохраненные снимки KPI и позволяет сохранить или восстановить журнал разборов.",
    Icon: ShieldCheck,
  },
];

const SITUATION_ACTIONS = [
  {
    situation: "Не понимаю причину проблемы",
    action: "Перейдите в режим аналитика и проверьте срезы, топы и детали. Если ИИ-помощник включен, используйте его для черновика гипотезы в A3-разборе.",
  },
  {
    situation: "Нужно разобрать проблему",
    action: "Нажмите «Разобрать», зафиксируйте причину, действие, исполнителя и срок. ИИ может предложить черновик формулировок, но решение остается за пользователем.",
  },
  {
    situation: "Нужно проконтролировать поручение",
    action: "Откройте разборы, проверьте исполнителя, срок и статус.",
  },
];

export function HelpPage() {
  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <DashboardHeaderMark Icon={CircleHelp} />
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-raport-text md:text-3xl">Как пользоваться Рапортом</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Как Excel докладывает главное</span>
            </div>
          </div>
        }
        description="От загрузки отчета до управленческого разбора отклонения: что смотреть, где уточнять и когда назначать действие."
        actions={(themeToggle) => (
          <div className="flex items-center justify-end gap-2">
            <HeaderIconButton to="/" title="На главную">
              <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
            </HeaderIconButton>
            <HeaderIconButton to="/a3" title="Открыть журнал A3-разборов">
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
            </HeaderIconButton>
            {themeToggle}
          </div>
        )}
      />

      <div className="grid gap-4">
        <SectionCard title="Если вы впервые здесь" description="Начните с загрузки отчета. Остальное Рапорт подскажет по ходу работы." Icon={Compass}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div className="rounded-control border border-raport-action-border bg-raport-action-bg p-5">
              <p className="text-base font-bold text-raport-text">Просто загрузите отчет.</p>
              <p className="mt-2 text-sm leading-relaxed text-raport-muted">
                Рапорт сам откроет нужный дашборд. Остальные разделы пригодятся, когда появится вопрос.
              </p>
            </div>
            <div className="grid gap-2">
              <ButtonLink
                to="/"
                className="min-h-11 px-4 py-3"
              >
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
                Загрузить отчет
              </ButtonLink>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Что делать, если…" description="Быстрые подсказки для типовых ситуаций." Icon={ListChecks}>
          <div className="overflow-hidden rounded-control border border-raport-border divide-y divide-raport-border">
            {SITUATION_ACTIONS.map((item) => (
              <div
                key={item.situation}
                className="grid gap-2 border-raport-border bg-raport-surface px-4 py-3 text-sm md:grid-cols-[260px_minmax(0,1fr)] md:items-center"
              >
                <div className="font-bold text-raport-text">{item.situation}</div>
                <div className="leading-relaxed text-raport-muted">{item.action}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Что можно включить в настройках"
          description="Включается на главной: Дополнительные возможности → Настройки Рапорта. Все опции необязательны."
          Icon={Filter}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {EXTRA_FEATURES.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-control border border-raport-border bg-raport-surface p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-raport-text">
                  <Icon className="h-4 w-4 shrink-0 text-raport-muted" strokeWidth={2} />
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-raport-muted">{description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </PageShell>
  );
}
