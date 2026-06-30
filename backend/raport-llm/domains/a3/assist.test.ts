import { describe, expect, it, vi } from "vitest";

const { buildA3AssistPrompt } = await import("./prompt.mjs");
const { assistA3Protocol } = await import("./assist.mjs");
const { parseA3AssistRequest } = await import("./schema.mjs");

function request(overrides = {}) {
  return {
    dashboardType: "ssz",
    dashboardTitle: "ССЗ",
    periodLabel: "01.06.2026 - 09.06.2026",
    deviationTitle: "Доля работ по технологии ниже цели",
    metricName: "Доля работ по технологии",
    actualValue: "7,2%",
    targetValue: "70%",
    deviationScale: "отклонение: 62,8 п.п.",
    affectedObjectType: "department",
    affectedObjectName: "400 Цех аппаратов высокого давления № 40",
    evidenceSummary: "Цех: 4 623 н-ч без технологии. Операция: Зачистка швов — 1 102,2 н-ч.",
    problem: "Доля работ по технологии ниже цели.",
    mode: "draft_suggestions",
    ...overrides,
  };
}

function config(overrides = {}) {
  return {
    enabled: true,
    ollamaChatUrl: "http://localhost:11434/api/chat",
    model: "qwen3:1.7b",
    a3Model: "qwen3:4b",
    timeoutMs: 8000,
    ...overrides,
  };
}

function validModelResponse() {
  return JSON.stringify({
    suggestions: {
      problem: "Доля работ по технологии существенно ниже цели.",
      causeHypotheses: ["Не фиксируется технология в операциях", "Нет контроля перед закрытием смены"],
      fiveWhys: [],
      countermeasures: ["Проверять технологию перед закрытием смены"],
      expectedResult: "Доля работ по технологии растет к целевому уровню.",
      checkCriteria: "Еженедельно проверять долю работ по технологии.",
    },
    warnings: ["ИИ предлагает черновик. Решение принимает пользователь."],
  });
}

function modelResponseWithoutFinalDots() {
  return JSON.stringify({
    suggestions: {
      problem: "SLA заявок ниже цели контроля",
      causeHypotheses: ["Заявки долго ждут назначения", "Приоритеты обработки не закреплены"],
      fiveWhys: [],
      countermeasures: ["Закрепить правило первичного разбора заявок", "Проверять очередь заявок ежедневно"],
      expectedResult: "SLA выполнен на уровне цели контроля",
      checkCriteria: "Повторно проверить показатель в следующем отчете",
    },
    warnings: ["ИИ предлагает черновик"],
  });
}

function modelResponseWithUnsupportedNumericClaim() {
  return JSON.stringify({
    suggestions: {
      problem: "SLA заявок ниже цели контроля.",
      causeHypotheses: ["Заявки долго ждут назначения."],
      fiveWhys: [],
      countermeasures: ["Увеличить количество исполнителей на 10%", "Проверять приоритеты заявок ежедневно"],
      expectedResult: "SLA выполнен на уровне 80%.",
      checkCriteria: "Повторно проверить показатель в следующем отчете.",
    },
    warnings: [],
  });
}

describe("A3 Assist backend domain", () => {
  it("accepts limited A3 snapshot and rejects raw Excel rows", () => {
    expect(parseA3AssistRequest(request()).success).toBe(true);

    const result = parseA3AssistRequest(request({ rawRows: [{ secret: "raw excel row" }] }));

    expect(result.success).toBe(false);
    expect(result.errors[0].path).toBe("$");
  });

  it("keeps prompt boundaries explicit", () => {
    const prompt = buildA3AssistPrompt(request());

    expect(prompt).toContain("Сделай короткий черновик деловым русским языком");
    expect(prompt).toContain("Не копируй правила из prompt");
    expect(prompt).toContain("Не придумывай факты вне контекста");
    expect(prompt).toContain("Не добавляй новые числа, проценты, даты и сроки");
    expect(prompt).toContain("Запрещено использовать числа, которых нет в контексте");
    expect(prompt).toContain("в следующем отчете");
    expect(prompt).toContain("Не объясняй отклонение ошибками данных");
    expect(prompt).toContain("Не переноси термины из других дашбордов");
    expect(prompt).toContain("Фокус дашборда");
    expect(prompt).toContain("до 3 предметных гипотез причин");
    expect(prompt).toContain('"fiveWhys": []');
    expect(prompt).toContain("Верни только JSON");
    expect(prompt).toContain("Решение принимает пользователь");
  });

  it("builds a field-specific prompt for step-by-step A3 assistance", () => {
    const prompt = buildA3AssistPrompt(request({ field: "cause" }));

    expect(prompt).toContain("Заполни только поле: Гипотезы причин");
    expect(prompt).toContain('"problem": ""');
    expect(prompt).toContain('"countermeasures": []');
    expect(prompt).toContain('"expectedResult": ""');
    expect(prompt).toContain('"checkCriteria": ""');
  });

  it("uses quality recommendation as a field improvement task", () => {
    const input = request({ field: "cause", qualityIssue: "Причина повторяет проблему." });
    const prompt = buildA3AssistPrompt(input);

    expect(parseA3AssistRequest(input).success).toBe(true);
    expect(prompt).toContain("Рекомендация качества: Причина повторяет проблему.");
    expect(prompt).toContain("Исправь указанную слабость формулировки");
    expect(prompt).toContain("Заполни только поле: Гипотезы причин");
  });

  it("keeps dashboard domain guidance isolated by dashboard type", () => {
    const cases = [
      {
        dashboardType: "print",
        expectedFocus: "Печать: объем",
        forbiddenFocus: ["Техподдержка: SLA", "ССЗ: технология"],
      },
      {
        dashboardType: "support",
        expectedFocus: "Техподдержка: SLA",
        forbiddenFocus: ["Печать: объем", "ССЗ: технология"],
      },
      {
        dashboardType: "ssz",
        expectedFocus: "ССЗ: технология",
        forbiddenFocus: ["Печать: объем", "Техподдержка: SLA"],
      },
    ];

    for (const item of cases) {
      const prompt = buildA3AssistPrompt(request({ dashboardType: item.dashboardType }));

      expect(prompt).toContain(item.expectedFocus);
      for (const forbidden of item.forbiddenFocus) {
        expect(prompt).not.toContain(forbidden);
      }
    }
  });

  it("returns validated suggestions from Ollama", async () => {
    const callOllama = vi.fn().mockResolvedValue(validModelResponse());

    const result = await assistA3Protocol(request(), config(), { callOllama });

    expect(callOllama).toHaveBeenCalledTimes(1);
    expect(callOllama).toHaveBeenCalledWith(
      expect.objectContaining({ model: "qwen3:4b", keepAlive: "30m", numPredict: 350, timeoutMs: 180000 }),
    );
    expect(result.ok).toBe(true);
    expect(result.suggestions.problem).toContain("ниже цели");
    expect(result.suggestions.countermeasures).toHaveLength(1);
  });

  it("normalizes assistant text with final punctuation", async () => {
    const callOllama = vi.fn().mockResolvedValue(modelResponseWithoutFinalDots());

    const result = await assistA3Protocol(request({ dashboardType: "support" }), config(), { callOllama });

    expect(result.ok).toBe(true);
    expect(result.suggestions.problem).toBe("SLA заявок ниже цели контроля.");
    expect(result.suggestions.causeHypotheses).toEqual([
      "Заявки долго ждут назначения.",
      "Приоритеты обработки не закреплены.",
    ]);
    expect(result.suggestions.countermeasures[0]).toBe("Закрепить правило первичного разбора заявок.");
    expect(result.suggestions.expectedResult).toBe("SLA выполнен на уровне цели контроля.");
    expect(result.warnings).toEqual(["ИИ предлагает черновик."]);
  });

  it("removes numeric claims that are not present in A3 context", async () => {
    const callOllama = vi.fn().mockResolvedValue(modelResponseWithUnsupportedNumericClaim());

    const result = await assistA3Protocol(
      request({
        dashboardType: "support",
        dashboardTitle: "Техподдержка",
        deviationTitle: "SLA заявок ниже цели контроля",
        metricName: "SLA выполнен",
        actualValue: "76,7%",
        targetValue: "80%",
        deviationScale: "Просрочено: 10 заявок, 23,3%",
      }),
      config(),
      { callOllama },
    );

    expect(result.ok).toBe(true);
    expect(result.suggestions.countermeasures).toEqual([
      "Увеличить количество исполнителей.",
      "Проверять приоритеты заявок ежедневно.",
    ]);
    expect(result.suggestions.expectedResult).toBe("SLA выполнен на уровне 80%.");
  });

  it("reuses cached suggestions for the same A3 snapshot", async () => {
    const store = new Map();
    const cache = {
      getA3Assist: (key) => store.get(key) ?? null,
      putA3Assist: (key, value) => store.set(key, value),
    };
    const callOllama = vi.fn().mockResolvedValue(modelResponseWithoutFinalDots());
    const input = request({
      dashboardType: "support",
      dashboardTitle: "Техподдержка",
      deviationTitle: "SLA заявок ниже цели контроля",
      metricName: "SLA выполнения",
      actualValue: "61,1%",
      targetValue: "80%",
      affectedObjectName: "Почта / Outlook",
      evidenceSummary: "Есть нарушения SLA по закрытым заявкам.",
    });

    const first = await assistA3Protocol(input, config({ cacheEnabled: true, schemaVersion: "4" }), { callOllama, cache });
    const second = await assistA3Protocol(input, config({ cacheEnabled: true, schemaVersion: "4" }), { callOllama, cache });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.suggestions).toEqual(first.suggestions);
    expect(callOllama).toHaveBeenCalledTimes(1);
  });

  it("uses the base model for A3 only when dedicated A3 model is not configured", async () => {
    const callOllama = vi.fn().mockResolvedValue(validModelResponse());

    await assistA3Protocol(request(), config({ a3Model: "" }), { callOllama });

    expect(callOllama).toHaveBeenCalledWith(expect.objectContaining({ model: "qwen3:1.7b" }));
  });

  it("does not lower an explicitly longer service timeout", async () => {
    const callOllama = vi.fn().mockResolvedValue(validModelResponse());

    await assistA3Protocol(request(), config({ timeoutMs: 240000 }), { callOllama });

    expect(callOllama).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 240000 }));
  });

  it("does not call Ollama when AI is disabled", async () => {
    const callOllama = vi.fn();

    const result = await assistA3Protocol(request(), config({ enabled: false }), { callOllama });

    expect(callOllama).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, suggestions: null, error: "ИИ-помощник выключен" });
  });

  it("returns safe fallback for invalid model JSON", async () => {
    const callOllama = vi.fn().mockResolvedValue("not-json");

    const result = await assistA3Protocol(request(), config(), { callOllama });

    expect(result).toMatchObject({ ok: false, suggestions: null, error: "ИИ-помощник временно недоступен" });
  });
});
