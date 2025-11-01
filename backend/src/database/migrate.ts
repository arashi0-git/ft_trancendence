import fs from "fs";
import path from "path";
import { db } from "./connection";

function resolveMigrationsDir(): string | null {
  const candidateDirs = [
    path.join(process.cwd(), "database", "migrations"),
    path.join(__dirname, "../../../database/migrations"),
    "/app/database/migrations",
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return null;
}

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

    const migrationsDir = resolveMigrationsDir();

    if (!migrationsDir) {
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
        [file]
      );

      if (!executed) {
        if (file === "001_add_two_factor.sql") {
          type SchemaInfo = { name: string };
          const columns = await db.all<SchemaInfo>("PRAGMA table_info(users)");
          const hasTwoFactorEnabled = columns.some(
            (column) => column.name === "two_factor_enabled"
          );

          let hasTwoFactorChallengesTable = false;
          if (hasTwoFactorEnabled) {
            const challengeTable = await db.get<SchemaInfo>(
              "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'two_factor_challenges'"
            );
            hasTwoFactorChallengesTable = !!challengeTable;

            if (!hasTwoFactorChallengesTable) {
              console.log(
                "Found two_factor_enabled without two_factor_challenges; restoring missing table"
              );
              await db.exec(`
                CREATE TABLE IF NOT EXISTS two_factor_challenges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    code_hash TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_two_factor_challenges_user ON two_factor_challenges(user_id);
              `);
              hasTwoFactorChallengesTable = true;
            }
          }

          if (hasTwoFactorEnabled && hasTwoFactorChallengesTable) {
            console.log(
              `Skipping migration ${file}; two_factor schema already present`
            );
            await db.run("INSERT INTO migrations (filename) VALUES (?)", [
              file,
            ]);
            continue;
          }
        }

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
