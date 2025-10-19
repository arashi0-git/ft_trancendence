import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export class DatabaseWrapper {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    try {
      this.db = new Database(dbPath);
      this.db.pragma("foreign_keys = ON");
      console.log("Connected to SQLite database");
    } catch (err) {
      console.error("Error opening database:", err);
      throw err;
    }
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params?: unknown[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(params || []);
  }

  get<T = unknown>(sql: string, params?: unknown[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(params || []) as T | undefined;
  }

  all<T = unknown>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(params || []) as T[];
  }

  close(): void {
    try {
      this.db.close();
      console.log("Database connection closed");
    } catch (err) {
      console.error("Error closing database:", err);
      throw err;
    }
  }
}

export const db = new DatabaseWrapper(
  process.env.DATABASE_PATH || "./database/transcendence.db",
);
