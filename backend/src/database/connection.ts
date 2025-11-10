import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export class DatabaseWrapper {
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.ensureDirectory();
    this.db = this.createConnection();
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

  reset(): void {
    this.close();
    const files = [this.dbPath, this.dbPath + "-wal", this.dbPath + "-shm"];
    for (const p of files) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch (err) {
        console.error("Error deleting database file:", err);
        throw err;
      }
    }
    this.ensureDirectory();
    this.db = this.createConnection();
    console.log("Database reset and reopened");
  }

  getPath(): string {
    return this.dbPath;
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); // mkdir -p
    }
  }

  private createConnection(): Database.Database {
    try {
      const connection = new Database(this.dbPath);
      // Enable foreign key constraints for data integrity
      connection.pragma("foreign_keys = ON");
      console.log("Connected to SQLite database");
      return connection;
    } catch (err) {
      console.error("Error opening database:", err);
      throw err;
    }
  }
}

export const db = new DatabaseWrapper(
  process.env.DATABASE_PATH || "./database/transcendence.db",
);
