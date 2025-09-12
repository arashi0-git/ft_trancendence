import fs from 'fs';
import path from 'path';
import { db } from './connection';



export async function initializeDatabase(): Promise<void> {
    try {
        const schemaPath = path.join(__dirname, '../../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await db.exec(schema);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed: ', error);
        throw error;
    }
}
