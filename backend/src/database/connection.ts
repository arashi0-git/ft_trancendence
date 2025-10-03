import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

export class DatabaseWrapper {
  private db!: sqlite3.Database;
  private ready: Promise<void>;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.ready = new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Error opening database:", err);
          reject(err);
        } else {
          console.log("Connected to SQLite database");
          this.db.run("PRAGMA foreign_keys = ON", (pragmaErr) => {
            if (pragmaErr) reject(pragmaErr);
            else resolve();
          });
        }
      });
    });
  }

  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  async exec(sql: string): Promise<void> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async run(sql: string, params?: any[]): Promise<void> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db.run(sql, params || [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async get(sql: string, params?: any[]): Promise<any> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db.get(sql, params || [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db.all(sql, params || [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async close(): Promise<void> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error("Error closing database:", err);
          reject(err);
        } else {
          console.log("Database connection closed");
          resolve();
        }
      });
    });
  }
}

export const db = new DatabaseWrapper(
  process.env.DATABASE_PATH || "./database/transcendence.db",
);
