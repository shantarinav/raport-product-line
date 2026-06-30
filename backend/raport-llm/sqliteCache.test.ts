import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const { PrintLlmSqliteCache } = await import("./sqliteCache.mjs");

const tempDirs: string[] = [];

function tempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "raport-print-llm-cache-"));
  tempDirs.push(dir);
  return join(dir, "cache.sqlite");
}

describe("PrintLlmSqliteCache", () => {
  afterEach(() => {
    tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  it("persists cached classifications across instances", () => {
    const dbPath = tempDbPath();
    const first = new PrintLlmSqliteCache(dbPath);
    first.set("doc-key", {
      normalized_title: "school homework",
      source: "llm",
      is_personal: true,
      primary_category: "education",
      risk_level: "high",
      confidence_raw: 0.9,
      needs_review: true,
      reason_short: "Похоже на учебный материал",
      signals: ["education"],
    });
    first.close();

    const second = new PrintLlmSqliteCache(dbPath);
    expect(second.get("doc-key")).toMatchObject({
      source: "llm",
      is_personal: true,
      primary_category: "education",
      risk_level: "high",
    });
    second.close();
  });

  it("updates an existing key instead of duplicating it", () => {
    const cache = new PrintLlmSqliteCache(tempDbPath());
    cache.set("doc-key", { source: "llm", is_personal: false, primary_category: "work" });
    cache.set("doc-key", { source: "llm", is_personal: true, primary_category: "education" });

    expect(cache.get("doc-key")).toMatchObject({
      is_personal: true,
      primary_category: "education",
    });
    expect(cache.count()).toBe(1);
    cache.close();
  });

  it("stores document classifications by title hash and loads them in batches", () => {
    const cache = new PrintLlmSqliteCache(tempDbPath());
    cache.putClassification("hash-a", { source: "llm", is_personal: true, primary_category: "education" }, { schemaVersion: "1", model: "qwen3:4b" });
    cache.putClassification("hash-b", { source: "llm", is_personal: false, primary_category: "work" }, { schemaVersion: "1", model: "qwen3:4b" });

    const result = cache.getClassifications(["hash-a", "missing", "hash-b"]);

    expect(result.get("hash-a")).toMatchObject({ is_personal: true, primary_category: "education" });
    expect(result.has("missing")).toBe(false);
    expect(result.get("hash-b")).toMatchObject({ is_personal: false, primary_category: "work" });
    expect(cache.countClassifications()).toBe(2);
    cache.close();
  });

  it("upserts document classifications by title hash", () => {
    const cache = new PrintLlmSqliteCache(tempDbPath());
    cache.putClassification("hash-a", { source: "llm", is_personal: false, primary_category: "work" }, { schemaVersion: "1", model: "qwen3:4b" });
    cache.putClassification("hash-a", { source: "llm", is_personal: true, primary_category: "education" }, { schemaVersion: "1", model: "qwen3:4b" });

    expect(cache.getClassification("hash-a")).toMatchObject({ is_personal: true, primary_category: "education" });
    expect(cache.countClassifications()).toBe(1);
    cache.close();
  });

  it("ignores malformed document classification payloads", () => {
    const cache = new PrintLlmSqliteCache(tempDbPath());
    cache.open()
      .prepare(
        "INSERT INTO print_document_classifications (title_hash, schema_version, model, result_json, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
      )
      .run("broken", "1", "qwen3:4b", "not-json");

    expect(cache.getClassification("broken")).toBeNull();
    expect(cache.getClassifications(["broken"]).size).toBe(0);
    cache.close();
  });

  it("stores A3 assist responses by snapshot hash", () => {
    const cache = new PrintLlmSqliteCache(tempDbPath());
    const payload = {
      suggestions: {
        problem: "SLA ниже цели.",
        causeHypotheses: ["Очередь заявок не разбирается вовремя."],
        fiveWhys: ["Почему SLA ниже цели? Заявки ждут назначения."],
        countermeasures: ["Назначить ответственного за первичный разбор."],
        expectedResult: "SLA достигает цели контроля.",
        checkCriteria: "Проверить SLA в следующем отчете.",
      },
      warnings: ["ИИ предлагает черновик."],
    };

    cache.putA3Assist("a3-key", payload, { schemaVersion: "4", model: "qwen3:1.7b" });

    expect(cache.getA3Assist("a3-key")).toEqual(payload);
    expect(cache.countA3Assist()).toBe(1);
    cache.close();
  });

  it("enables WAL mode and busy timeout", () => {
    const cache = new PrintLlmSqliteCache(tempDbPath(), { busyTimeoutMs: 1234 });
    const db = cache.open();

    const journalMode = db.prepare("PRAGMA journal_mode").get();
    const busyTimeout = db.prepare("PRAGMA busy_timeout").get();

    expect(String(journalMode?.journal_mode || journalMode?.[0]).toLowerCase()).toBe("wal");
    expect(Number(busyTimeout?.timeout ?? busyTimeout?.busy_timeout ?? busyTimeout?.[0])).toBe(1234);
    cache.close();
  });
});
