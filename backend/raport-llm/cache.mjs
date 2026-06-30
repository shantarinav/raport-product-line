import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function pagesBucket(pages) {
  if (pages <= 1) return "1";
  if (pages <= 5) return "2-5";
  if (pages <= 20) return "6-20";
  return "20+";
}

export function canonicalCacheInput(input) {
  return JSON.stringify({
    schema_version: String(input.schemaVersion),
    model_name: input.modelName,
    normalized_title: input.normalizedTitle,
    pages_bucket: pagesBucket(input.pages),
    color: Boolean(input.color),
    duplex: Boolean(input.duplex),
    paper_size: input.paperSize || "",
  });
}

export function cacheKey(input) {
  return createHash("sha256").update(canonicalCacheInput(input)).digest("hex");
}

export class PrintLlmCache {
  constructor(filePath = resolve(".cache", "raport-llm-cache.json")) {
    this.filePath = filePath;
    this.items = new Map();
    this.loaded = false;
  }

  load() {
    if (this.loaded) return;
    this.loaded = true;
    if (!existsSync(this.filePath)) return;
    const parsed = JSON.parse(readFileSync(this.filePath, "utf8"));
    Object.entries(parsed).forEach(([key, value]) => this.items.set(key, value));
  }

  get(key) {
    this.load();
    return this.items.get(key) ?? null;
  }

  set(key, value) {
    this.load();
    this.items.set(key, value);
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.items), null, 2));
  }
}

