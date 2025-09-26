import fs from "fs";
import path from "path";
import { db } from "./connection";
import { runMigrations } from "./migrate";

export async function initializeDatabase(): Promise<void> {
  try {
    // Try different possible schema paths
    const possiblePaths = [
      "/app/database/schema.sql", // Docker container path
      path.join(process.cwd(), "database", "schema.sql"), // Local development from root
      path.join(__dirname, "../../../database", "schema.sql"), // Relative to this file
      path.join(process.cwd(), "database", "shcema.sql"), // Fallback for typo
    ];

    let schemaPath: string | null = null;
    let schema: string = "";

    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        schemaPath = testPath;
        schema = fs.readFileSync(testPath, "utf8");
        break;
      }
    }

    if (!schemaPath) {
      throw new Error("Schema file not found in any expected location");
    }

    console.log(`Loading database schema from: ${schemaPath}`);
    await db.exec(schema);

    // Run migrations after schema initialization
    await runMigrations();

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed: ", error);
    throw error;
  }
}
