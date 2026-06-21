import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class PrintLlmSqliteCache {
  constructor(filePath = resolve(".cache", "print-llm-cache.sqlite")) {
    this.filePath = filePath;
    this.db = null;
  }

  open() {
    if (this.db) return this.db;
    mkdirSync(dirname(this.filePath), { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS print_llm_classifications (
        cache_key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS print_document_classifications (
        title_hash TEXT PRIMARY KEY,
        schema_version TEXT NOT NULL,
        model TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    return this.db;
  }

  get(key) {
    const row = this.open().prepare("SELECT payload FROM print_llm_classifications WHERE cache_key = ?").get(key);
    if (!row?.payload) return null;
    try {
      return JSON.parse(row.payload);
    } catch {
      return null;
    }
  }

  set(key, value) {
    this.open()
      .prepare(
        `
          INSERT INTO print_llm_classifications (cache_key, payload, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(cache_key) DO UPDATE SET
            payload = excluded.payload,
            updated_at = datetime('now')
        `,
      )
      .run(key, JSON.stringify(value));
  }

  getClassification(titleHash) {
    const row = this.open().prepare("SELECT result_json FROM print_document_classifications WHERE title_hash = ?").get(titleHash);
    if (!row?.result_json) return null;
    try {
      return JSON.parse(row.result_json);
    } catch {
      return null;
    }
  }

  getClassifications(titleHashes) {
    const uniqueHashes = [...new Set(titleHashes.filter(Boolean))];
    const result = new Map();
    if (!uniqueHashes.length) return result;

    const placeholders = uniqueHashes.map(() => "?").join(", ");
    const rows = this.open()
      .prepare(`SELECT title_hash, result_json FROM print_document_classifications WHERE title_hash IN (${placeholders})`)
      .all(...uniqueHashes);

    rows.forEach((row) => {
      try {
        result.set(row.title_hash, JSON.parse(row.result_json));
      } catch {
        // Ignore malformed local records; the caller can reclassify the document.
      }
    });
    return result;
  }

  putClassification(titleHash, value, meta) {
    this.open()
      .prepare(
        `
          INSERT INTO print_document_classifications (title_hash, schema_version, model, result_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(title_hash) DO UPDATE SET
            schema_version = excluded.schema_version,
            model = excluded.model,
            result_json = excluded.result_json,
            updated_at = datetime('now')
        `,
      )
      .run(titleHash, String(meta.schemaVersion), String(meta.model), JSON.stringify(value));
  }

  countClassifications() {
    const row = this.open().prepare("SELECT COUNT(*) AS count FROM print_document_classifications").get();
    return Number(row?.count || 0);
  }

  count() {
    const row = this.open().prepare("SELECT COUNT(*) AS count FROM print_llm_classifications").get();
    return Number(row?.count || 0);
  }

  close() {
    this.db?.close();
    this.db = null;
  }
}
