import sqlite3 from 'sqlite3';
import path from 'path';

export class Database {
    private db: sqlite3.Database;

    constructor(dbPath: string) {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Database connection error: ', err);
                throw err;
            }
            console.log('Connected to SQLite database');
        });
    }

    async exec(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async run(sql: string, params?: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params || [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async get(sql: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params || [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async all(sql: string, params?: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params || [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    close(): void {
        this.db.close((err) => {
            if (err) {
                console.log('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

export const db = new Database(process.env.DATABASE_PATH || './database/transcendence.db');