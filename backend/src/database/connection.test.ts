import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";

describe("DatabaseWrapper", () => {
  type DatabaseModule = typeof import("./connection");
  let DatabaseWrapper: DatabaseModule["DatabaseWrapper"];

  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    ({ DatabaseWrapper } = await import("./connection"));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("executes statements and retrieves data", () => {
    const db = new DatabaseWrapper(":memory:");
    try {
      db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

      const insertResult = db.run("INSERT INTO users (name) VALUES (?)", [
        "Alice",
      ]);
      expect(insertResult.changes).toBe(1);

      const singleRow = db.get<{ name: string }>(
        "SELECT name FROM users WHERE id = ?",
        [insertResult.lastInsertRowid],
      );
      expect(singleRow).toEqual({ name: "Alice" });

      const rows = db.all<{ name: string }>("SELECT name FROM users");
      expect(rows).toEqual([{ name: "Alice" }]);
    } finally {
      db.close();
    }
  });
});
