import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { db } from "./connection";

export async function initializeDatabase(): Promise<void> {
  try {
    const possiblePaths = [
      "/app/database/schema.sql", // Docker container path
      path.join(process.cwd(), "database", "schema.sql"), // Local development from root
      path.join(process.cwd(), "../database", "schema.sql"), // Local development from backend or frontend
    ];

    let schemaPath: string | null = null;
    let schema: string | null = null;

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

    if (!schema) {
      throw new Error("Failed to load schema file");
    }

    console.log(`Loading database schema from: ${schemaPath}`);

    const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");
    const hashFile = path.join(path.dirname(db.getPath()), ".schema-hash");
    let previousHash: string | null = null;

    if (fs.existsSync(hashFile)) {
      previousHash = fs.readFileSync(hashFile, "utf8").trim();
    }

    const shouldResetDatabase =
      previousHash === null || previousHash !== schemaHash;

    if (shouldResetDatabase) {
      console.warn(
        previousHash
          ? "Detected schema change; resetting local database."
          : "No previous schema hash found; resetting local database to ensure consistency.",
      );
      db.reset();
      fs.writeFileSync(hashFile, `${schemaHash}\n`, "utf8");
    }

    db.exec(schema);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed: ", error);
    throw error;
  }
}
