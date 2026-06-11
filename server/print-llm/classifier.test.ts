import { describe, expect, it, vi } from "vitest";

const { classifyPrintPersonalItems } = await import("./classifier.mjs");

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

function item(id = "row-1") {
  return {
    id,
    document_title: "Matematika_5klass_domashka.pdf",
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
}

describe("classifyPrintPersonalItems", () => {
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
});
