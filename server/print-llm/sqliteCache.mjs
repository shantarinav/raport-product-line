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

  count() {
    const row = this.open().prepare("SELECT COUNT(*) AS count FROM print_llm_classifications").get();
    return Number(row?.count || 0);
  }

  close() {
    this.db?.close();
    this.db = null;
  }
}
