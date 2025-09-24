import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseWrapper {
    private db: Database.Database;

    constructor(dbPath: string) {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        this.db = new Database(dbPath);
        this.db.pragma('foreign_keys = ON');
        console.log('Connected to SQLite database');
    }

    async exec(sql: string): Promise<void> {
        this.db.exec(sql);
    }

    async run(sql: string, params?: any[]): Promise<void> {
        const stmt = this.db.prepare(sql);
        stmt.run(params || []);
    }

    async get(sql: string, params?: any[]): Promise<any> {
        const stmt = this.db.prepare(sql);
        return stmt.get(params || []);
    }

    async all(sql: string, params?: any[]): Promise<any[]> {
        const stmt = this.db.prepare(sql);
        return stmt.all(params || []);
    }

    close(): void {
        this.db.close();
        console.log('Database connection closed');
    }
}

export const db = new DatabaseWrapper(process.env.DATABASE_PATH || './database/transcendence.db');