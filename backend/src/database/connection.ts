import sqlite3 from 'sqlite3';
import path from 'path';

export class Database {
    private db: sqlite3.Database;

    constructor(dbPath: string) {

    }

    async run(sql: string, params: any[]): Promise<void> {

    }

    async get(sql: string, params?: any[]): Promise<any> {

    }

    async all(sql: string, params?: any[]): Promise<any[]> {

    }

    close(): void {

    }
}

export const db = new Database(process.env.DATABASE_PATH || './database/transcendence.db');