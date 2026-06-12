import { describe, expect, it, vi } from "vitest";

const { classifyMissingPrintPersonalItems, classifyPrintPersonalItems, lookupPrintPersonalClassifications } = await import("./classifier.mjs");
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
    schemaVersion: "1",
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

    expect(prompt).toContain("The reason_short field must be written in Russian.");
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
    expect(second.items[0]).toMatchObject({ id: "second", source: "llm", primary_category: "education" });
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
    expect(result.items[0]).toMatchObject({ id: "known", source: "llm", primary_category: "education" });
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
});
