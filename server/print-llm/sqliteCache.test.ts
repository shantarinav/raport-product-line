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
});
