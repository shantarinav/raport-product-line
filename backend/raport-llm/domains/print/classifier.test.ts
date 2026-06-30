import { describe, expect, it, vi } from "vitest";

const { classifyMissingPrintPersonalItems, classifyPrintPersonalItems, lookupPrintPersonalClassifications } = await import("./classifier.mjs");
const { readRaportLlmConfig } = await import("../../config.mjs");
const { buildPrintLlmPrompt } = await import("./prompt.mjs");

function config(overrides = {}) {
  return {
    enabled: true,
    ollamaBaseUrl: "http://localhost:11434",
    ollamaChatUrl: "http://localhost:11434/api/chat",
    model: "qwen3:4b",
    timeoutMs: 8000,
    batchSize: 20,
    cacheEnabled: true,
    schemaVersion: "4",
    ...overrides,
  };
}

function item(id = "row-1", documentTitle = "Matematika_5klass_domashka.pdf") {
  return {
    id,
    document_title: documentTitle,
    pages: 2,
    color: false,
    duplex: false,
    paper_size: "A4",
  };
}

function validResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "education",
    confidence_raw: 0.82,
    needs_review: true,
    reason_short: "Похоже на учебный материал",
    signals: ["education", "children_or_school"],
  });
}

function personalHouseholdResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "household",
    confidence_raw: 0.86,
    needs_review: true,
    reason_short: "Документ похож на личную бытовую заметку.",
    signals: ["household"],
  });
}

function workLikeEducationResponse() {
  return JSON.stringify({
    is_personal: false,
    primary_category: "education",
    confidence_raw: 0.95,
    needs_review: false,
    reason_short: "Похоже на учебный материал",
    signals: ["education"],
  });
}

function explicitWorkResponse() {
  return JSON.stringify({
    is_personal: false,
    primary_category: "work",
    confidence_raw: 0.95,
    needs_review: false,
    reason_short: "Похоже на рабочий отчет",
    signals: ["work_like"],
  });
}

function contradictoryTechnicalResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "medical",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "Титул содержит термины, связанные с техническими деталями подшипника, что указывает на техническую документацию.",
    signals: ["technical_scan_name"],
  });
}

function professionalDocumentResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "other_personal",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "Название содержит термины, связанные с безопасностью и идентификацией опасностей, что указывает на профессиональную документацию.",
    signals: ["unknown"],
  });
}

function corporateDocumentResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "finance",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "протокол портфеля - корпоративный документ, не относится к персональному контексту из списка выше",
    signals: ["unknown"],
  });
}

function serviceNoteResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "other_personal",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "Служебная записка по согласованию закупки пленки - корпоративный документ.",
    signals: ["unknown"],
  });
}

function corporateStandardResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "other_personal",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "Нестандартный номер документа без явных личных данных, возможно, корпоративный стандарт.",
    signals: ["unknown"],
  });
}

function corporateHealthMemoResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "medical",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "проф осмотр памятка эдельвейс 8 марта : корпоративная памятка для профосмотра",
    signals: ["medical"],
  });
}

function noPersonalContextResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "other_personal",
    confidence_raw: 0.9,
    needs_review: true,
    reason_short: "Нестандартный номер документа без явного персонального контекста в названии, не относится к перечисленным личным категориям.",
    signals: ["unknown"],
  });
}

function personalNonCorporateResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "household",
    confidence_raw: 0.95,
    needs_review: false,
    reason_short: "примерное меню на неделю — это личное планирование питания, не связанное с корпоративной деятельностью.",
    signals: ["household"],
  });
}

function personalEducationWithWorkLikeSignalResponse() {
  return JSON.stringify({
    is_personal: true,
    primary_category: "education",
    confidence_raw: 0.9,
    needs_review: false,
    reason_short: "Диплом для личного использования, не указана корпоративная тренинговая программа или проектная документация.",
    signals: ["work_like", "education"],
  });
}

function cachedWrongWorkForPersonalEducation() {
  return {
    source: "llm",
    is_personal: false,
    primary_category: "work",
    confidence_raw: 0.9,
    needs_review: false,
    reason_short: "Диплом для личного использования, не указана корпоративная тренинговая программа или проектная документация.",
    signals: ["work_like", "education"],
  };
}

class MemoryCache {
  constructor() {
    this.items = new Map();
  }
  get(key) {
    return this.items.get(key) ?? null;
  }
  set(key, value) {
    this.items.set(key, value);
  }
  getClassification(titleHash) {
    return this.items.get(`doc:${titleHash}`) ?? null;
  }
  getClassifications(titleHashes) {
    const result = new Map();
    titleHashes.forEach((titleHash) => {
      const value = this.getClassification(titleHash);
      if (value) result.set(titleHash, value);
    });
    return result;
  }
  putClassification(titleHash, value) {
    this.items.set(`doc:${titleHash}`, value);
  }
}

describe("classifyPrintPersonalItems", () => {
  it("asks the model to write reason_short in Russian", () => {
    const prompt = buildPrintLlmPrompt({
      normalizedTitle: "school homework",
      pages: 1,
      color: false,
      duplex: false,
      paperSize: "A4",
    });

    expect(prompt).toContain("The reason_short field must be written in Russian for every result, including work and unknown.");
  });

  it("keeps prompt consistency rules explicit", () => {
    const prompt = buildPrintLlmPrompt({
      normalizedTitle: "service note purchase approval",
      pages: 1,
      color: true,
      duplex: false,
      paperSize: "A4",
    });

    expect(prompt).toContain('If reason_short says the document is corporate, professional, technical, work-related, service, procurement, standard, protocol, project, or safety documentation, then is_personal MUST be false.');
    expect(prompt).toContain('If is_personal is false, primary_category MUST be "work" or "unknown".');
    expect(prompt).toContain("Do not classify a document as personal only because it is printed in color, without duplex, or has many pages.");
    expect(prompt).toContain("corporate memos, корпоративная памятка, профосмотр");
    expect(prompt).toContain("Work examples: корпоративная памятка, профосмотр, памятка для профосмотра.");
    expect(prompt).toContain("Do not use medical for technical words such as bearing, корпус, подшипник, деталь, узел.");
    expect(prompt).toContain("служебная записка");
    expect(prompt).toContain("нестандарт");
  });

  it("uses schema version 4 by default to avoid old SQLite cache collisions", () => {
    expect(readRaportLlmConfig({}).schemaVersion).toBe("4");
  });

  it("uses a CPU-friendly Ollama timeout by default", () => {
    expect(readRaportLlmConfig({}).timeoutMs).toBe(30000);
  });

  it("returns disabled fallback without calling Ollama", async () => {
    const callOllama = vi.fn();
    const result = await classifyPrintPersonalItems([item()], config({ enabled: false }), { callOllama, cache: new MemoryCache() });
    expect(callOllama).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({ source: "disabled", risk_level: "unknown", needs_review: true });
  });

  it("retries once after invalid JSON", async () => {
    const callOllama = vi.fn().mockResolvedValueOnce("not-json").mockResolvedValueOnce(validResponse());
    const result = await classifyPrintPersonalItems([item()], config(), { callOllama, cache: new MemoryCache() });
    expect(callOllama).toHaveBeenCalledTimes(2);
    expect(result.items[0]).toMatchObject({ source: "llm", primary_category: "education", risk_level: "high" });
  });

  it("falls back after Ollama failure", async () => {
    const callOllama = vi.fn().mockRejectedValue(new Error("timeout"));
    const result = await classifyPrintPersonalItems([item()], config(), { callOllama, cache: new MemoryCache() });
    expect(result.items[0]).toMatchObject({
      source: "rules_fallback",
      is_personal: false,
      primary_category: "unknown",
      confidence_raw: 0,
      reason_short: "Ошибка классификации",
    });
  });

  it("uses cache for repeated classifications", async () => {
    const cache = new MemoryCache();
    const callOllama = vi.fn().mockResolvedValue(validResponse());
    await classifyPrintPersonalItems([item("first")], config(), { callOllama, cache });
    const second = await classifyPrintPersonalItems([item("second")], config(), { callOllama, cache });
    expect(callOllama).toHaveBeenCalledTimes(1);
    expect(second.items[0]).toMatchObject({ id: "second", source: "llm", primary_category: "education", cache_hit: true });
  });

  it("ignores stale non-LLM cache entries and asks the model", async () => {
    const cache = new MemoryCache();
    cache.get = vi.fn(() => ({
      source: "rules_fallback",
      is_personal: false,
      primary_category: "unknown",
      confidence_raw: 0,
      needs_review: true,
      reason_short: "Ошибка классификации",
      signals: ["unknown"],
      risk_level: "unknown",
    }));
    const callOllama = vi.fn().mockResolvedValue(validResponse());

    const result = await classifyPrintPersonalItems([item("diploma", "диплом.pdf")], config(), { callOllama, cache });

    expect(callOllama).toHaveBeenCalledTimes(1);
    expect(result.items[0]).toMatchObject({ id: "diploma", source: "llm", primary_category: "education" });
  });

  it("classifies batches", async () => {
    const callOllama = vi.fn().mockResolvedValue(validResponse());
    const result = await classifyPrintPersonalItems([item("1"), item("2"), item("3")], config({ batchSize: 2, cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
    });
    expect(result.items).toHaveLength(3);
    expect(callOllama).toHaveBeenCalledTimes(3);
  });

  it("routes Ollama calls through the queue dependency", async () => {
    const callOllama = vi.fn().mockResolvedValue(validResponse());
    const queue = {
      run: vi.fn((task) => task()),
    };

    await classifyPrintPersonalItems([item("queued")], config({ cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
      queue,
    });

    expect(queue.run).toHaveBeenCalledTimes(1);
    expect(callOllama).toHaveBeenCalledTimes(1);
  });

  it("upgrades education signals to personal review when there is no work-like signal", async () => {
    const callOllama = vi.fn().mockResolvedValue(workLikeEducationResponse());
    const result = await classifyPrintPersonalItems([item("education")], config({ cacheEnabled: false }), { callOllama, cache: new MemoryCache() });

    expect(result.items[0]).toMatchObject({
      is_personal: true,
      primary_category: "education",
      risk_level: "high",
      needs_review: true,
    });
  });

  it("does not upgrade explicit work-like results", async () => {
    const callOllama = vi.fn().mockResolvedValue(explicitWorkResponse());
    const result = await classifyPrintPersonalItems([item("work")], config({ cacheEnabled: false }), { callOllama, cache: new MemoryCache() });

    expect(result.items[0]).toMatchObject({
      is_personal: false,
      primary_category: "work",
      risk_level: "low",
    });
  });

  it("downgrades contradictory technical document classifications to work", async () => {
    const callOllama = vi.fn().mockResolvedValue(contradictoryTechnicalResponse());
    const result = await classifyPrintPersonalItems([item("bearing", "ТП_К0704.01.03.000 СБ Корпус подшипника.pdf")], config({ cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
    });

    expect(result.items[0]).toMatchObject({
      is_personal: false,
      primary_category: "work",
      risk_level: "low",
      needs_review: false,
    });
  });

  it("downgrades explicit professional or corporate document explanations to work", async () => {
    const callOllama = vi
      .fn()
      .mockResolvedValueOnce(professionalDocumentResponse())
      .mockResolvedValueOnce(corporateDocumentResponse())
      .mockResolvedValueOnce(serviceNoteResponse())
      .mockResolvedValueOnce(corporateStandardResponse())
      .mockResolvedValueOnce(noPersonalContextResponse());
    const result = await classifyPrintPersonalItems(
      [
        item("safety", "4. 600 перечень идентифицированных опасностей ОТК.xlsm"),
        item("protocol", "Протокол портфеля №14 от 23.05.2026 + апатит 08.06 + комм. 11.06.xlsx"),
        item("service-note", "Microsoft Word - Сл. записка Бирману согласование закупки пленки"),
        item("standard-102", "№102 нестандарт S25 АФ+МП+МПН V2.pdf"),
        item("standard-103", "№103 нестандарт S17+4 АФ+АФПН V2.pdf"),
      ],
      config({ cacheEnabled: false }),
      { callOllama, cache: new MemoryCache() },
    );

    expect(result.items).toEqual([
      expect.objectContaining({ id: "safety", is_personal: false, primary_category: "work", risk_level: "low" }),
      expect.objectContaining({ id: "protocol", is_personal: false, primary_category: "work", risk_level: "low" }),
      expect.objectContaining({ id: "service-note", is_personal: false, primary_category: "work", risk_level: "low" }),
      expect.objectContaining({ id: "standard-102", is_personal: false, primary_category: "work", risk_level: "low" }),
      expect.objectContaining({ id: "standard-103", is_personal: false, primary_category: "work", risk_level: "low" }),
    ]);
  });

  it("downgrades corporate medical check memo explanations to work", async () => {
    const callOllama = vi.fn().mockResolvedValue(corporateHealthMemoResponse());
    const result = await classifyPrintPersonalItems([item("health-memo", "Microsoft Word - 1Проф.осмотр памятка Эдельвейс 8 марта 146 (1)")], config({ cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
    });

    expect(result.items[0]).toMatchObject({
      is_personal: false,
      primary_category: "work",
      risk_level: "low",
      needs_review: false,
    });
  });

  it("keeps personal explanations that only mention absence of corporate context", async () => {
    const callOllama = vi.fn().mockResolvedValue(personalNonCorporateResponse());
    const result = await classifyPrintPersonalItems([item("menu", "ПРИМЕРНОЕ МЕНЮ НА неделю для 90 летнего")], config({ cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
    });

    expect(result.items[0]).toMatchObject({
      is_personal: true,
      primary_category: "household",
      risk_level: "high",
    });
  });

  it("does not let work_like override a clear personal education classification", async () => {
    const callOllama = vi.fn().mockResolvedValue(personalEducationWithWorkLikeSignalResponse());
    const result = await classifyPrintPersonalItems([item("diploma", "Железнов М.А. диплом.pdf")], config({ cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
    });

    expect(result.items[0]).toMatchObject({
      is_personal: true,
      primary_category: "education",
      risk_level: "high",
    });
  });

  it("reprocesses cached LLM results with the current postprocess rules", async () => {
    const cache = new MemoryCache();
    cache.get = () => cachedWrongWorkForPersonalEducation();
    const result = await classifyPrintPersonalItems([item("diploma", "Железнов М.А. диплом.pdf")], config(), {
      callOllama: vi.fn(),
      cache,
    });

    expect(result.items[0]).toMatchObject({
      is_personal: true,
      primary_category: "education",
      risk_level: "high",
    });
  });

  it("does not infer work-like classification from document title before postprocess", async () => {
    const callOllama = vi.fn().mockResolvedValue(personalHouseholdResponse());
    const result = await classifyPrintPersonalItems([item("service-note-title", "Microsoft Word - Сл. записка Бирману согласование закупки пленки")], config({ cacheEnabled: false }), {
      callOllama,
      cache: new MemoryCache(),
    });

    expect(result.items[0]).toMatchObject({
      is_personal: true,
      primary_category: "household",
      risk_level: "high",
    });
  });
});

describe("document classification lookup", () => {
  it("returns stored classifications and missing items without calling Ollama", async () => {
    const cache = new MemoryCache();
    const first = await classifyMissingPrintPersonalItems([item("known")], config(), { callOllama: vi.fn().mockResolvedValue(validResponse()), cache });
    const callOllama = vi.fn();

    const result = await lookupPrintPersonalClassifications([item("known"), item("missing", "Quarterly_work_report.pdf")], config(), { callOllama, cache });

    expect(callOllama).not.toHaveBeenCalled();
    expect(first.items[0]).toMatchObject({ source: "llm", primary_category: "education" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: "known", source: "llm", primary_category: "education", cache_hit: true });
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toMatchObject({ id: "missing" });
  });

  it("classifies missing items and stores document classifications for later lookup", async () => {
    const cache = new MemoryCache();
    const callOllama = vi.fn().mockResolvedValue(validResponse());

    const classified = await classifyMissingPrintPersonalItems([item("first")], config(), { callOllama, cache });
    const lookup = await lookupPrintPersonalClassifications([item("second")], config(), { callOllama: vi.fn(), cache });

    expect(classified.items[0]).toMatchObject({ id: "first", source: "llm", primary_category: "education" });
    expect(lookup.items[0]).toMatchObject({ id: "second", source: "llm", primary_category: "education" });
    expect(callOllama).toHaveBeenCalledTimes(1);
  });

  it("normalizes contradictory cached technical classifications during lookup", async () => {
    const cache = new MemoryCache();
    await classifyMissingPrintPersonalItems([item("first", "ТП_К0704.01.03.000 СБ Корпус подшипника.pdf")], config(), {
      callOllama: vi.fn().mockResolvedValue(contradictoryTechnicalResponse()),
      cache,
    });

    const result = await lookupPrintPersonalClassifications([item("second", "ТП_К0704.01.03.000 СБ Корпус подшипника.pdf")], config(), {
      callOllama: vi.fn(),
      cache,
    });

    expect(result.items[0]).toMatchObject({
      id: "second",
      source: "llm",
      is_personal: false,
      primary_category: "work",
      risk_level: "low",
    });
  });

  it("treats stale non-LLM document cache records as missing", async () => {
    const cache = new MemoryCache();
    cache.getClassifications = (titleHashes) => new Map(titleHashes.map((titleHash) => [
      titleHash,
      {
        source: "rules_fallback",
        is_personal: false,
        primary_category: "unknown",
        confidence_raw: 0,
        needs_review: true,
        reason_short: "Ошибка классификации",
        signals: ["unknown"],
        risk_level: "unknown",
      },
    ]));

    const result = await lookupPrintPersonalClassifications([item("stale", "диплом.pdf")], config(), { callOllama: vi.fn(), cache });

    expect(result.items).toHaveLength(0);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toMatchObject({ id: "stale" });
  });
});
