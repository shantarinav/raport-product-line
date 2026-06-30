function line(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `${label}: ${value}`;
}

function domainGuidance(dashboardType) {
  switch (String(dashboardType || "").toLowerCase()) {
    case "print":
      return "Печать: объем, цветная печать, односторонняя печать, личная или нецелевая печать, категории документов, пользователи, подразделения.";
    case "support":
      return "Техподдержка: SLA, очередь заявок, приоритет, тема обращения, исполнитель, общее время решения, чистое рабочее время, ожидания.";
    case "tessa":
      return "Tessa: договорные согласования, просрочки, дедлайны, ответственные, этапы, зависшие задания, передача между участниками.";
    case "ssz":
      return "ССЗ: технология, цех, операция, заказ, мастер, контроль смены, стандарт выполнения работ.";
    default:
      return "Текущий дашборд: используй только термины и объекты из входного A3 snapshot.";
  }
}

const FIELD_CONFIG = {
  problem: {
    label: "Проблема",
    problem: "1 короткое предложение",
    causeHypotheses: [],
    countermeasures: [],
    expectedResult: "",
    checkCriteria: "",
  },
  cause: {
    label: "Гипотезы причин",
    problem: "",
    causeHypotheses: ["до 3 предметных гипотез причин"],
    countermeasures: [],
    expectedResult: "",
    checkCriteria: "",
  },
  solution: {
    label: "Контрмеры",
    problem: "",
    causeHypotheses: [],
    countermeasures: ["до 3 конкретных действий"],
    expectedResult: "",
    checkCriteria: "",
  },
  expectedResult: {
    label: "Ожидаемый результат",
    problem: "",
    causeHypotheses: [],
    countermeasures: [],
    expectedResult: "1 реалистичное предложение",
    checkCriteria: "",
  },
  checkCriteria: {
    label: "Критерий проверки",
    problem: "",
    causeHypotheses: [],
    countermeasures: [],
    expectedResult: "",
    checkCriteria: "1 проверяемый критерий",
  },
};

function responseShape(field) {
  const config = FIELD_CONFIG[field] ?? {
    label: "A3-черновик",
    problem: "1 короткое предложение",
    causeHypotheses: ["до 3 предметных гипотез причин"],
    countermeasures: ["до 3 конкретных действий"],
    expectedResult: "1 реалистичное предложение",
    checkCriteria: "1 проверяемый критерий",
  };

  return {
    label: config.label,
    json: JSON.stringify(
      {
        suggestions: {
          problem: config.problem,
          causeHypotheses: config.causeHypotheses,
          fiveWhys: [],
          countermeasures: config.countermeasures,
          expectedResult: config.expectedResult,
          checkCriteria: config.checkCriteria,
        },
        warnings: [],
      },
      null,
      2,
    ),
  };
}

export function buildA3AssistPrompt(input) {
  const shape = responseShape(input.field);
  const context = [
    line("Дашборд", `${input.dashboardTitle} (${input.dashboardType})`),
    line("Период", input.periodLabel),
    line("Отклонение", input.deviationTitle),
    line("Показатель", input.metricName),
    line("Факт", input.actualValue),
    line("Цель", input.targetValue),
    line("Масштаб", input.deviationScale),
    line("Файл", input.sourceFileName),
    line("Объект", [input.affectedObjectType, input.affectedObjectName].filter(Boolean).join(" — ")),
    line("Доказательная база", input.evidenceSummary),
    line("Текущая проблема", input.problem),
    line("Текущая причина", input.cause),
    line("Текущее решение", input.solution),
    line("Рекомендация качества", input.qualityIssue),
  ]
    .filter(Boolean)
    .join("\n");

  return `/no_think

Ты ИИ-помощник для черновика A3-разбора в Рапорте.
Решение принимает пользователь. Не показывай ход мыслей.

Фокус дашборда:
${domainGuidance(input.dashboardType)}

Контекст A3:
${context}

Сделай короткий черновик деловым русским языком. Не копируй правила из prompt. Не придумывай факты вне контекста.
Не добавляй новые числа, проценты, даты и сроки. Если точного срока нет в контексте, пиши "в следующем отчете".
Запрещено использовать числа, которых нет в контексте: например "на 10%", "за 3 дня", "2 исполнителя".
Не объясняй отклонение ошибками данных, фильтров или дашборда, если это прямо не указано в контексте.
Не переноси термины из других дашбордов. Используй только предметную область из фокуса дашборда и контекста.
${input.qualityIssue ? "Исправь указанную слабость формулировки. Не переписывай остальные поля без необходимости." : ""}
${input.field ? `Заполни только поле: ${shape.label}. Остальные поля в JSON оставь пустыми.` : ""}

Верни только JSON без markdown:
${shape.json}`;
}
