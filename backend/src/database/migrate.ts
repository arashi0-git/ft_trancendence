import fs from "fs";
import path from "path";
import { db } from "./connection";

export async function runMigrations(): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    const migrationsDir = path.join(process.cwd(), "database", "migrations");

    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found, skipping migrations");
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const executed = await db.get(
        "SELECT filename FROM migrations WHERE filename = ?",
        [file],
      );

      if (!executed) {
        console.log(`Running migration: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, "utf8");

        await db.exec(migrationSQL);
        await db.run("INSERT INTO migrations (filename) VALUES (?)", [file]);

        console.log(`Migration completed: ${file}`);
      }
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}
