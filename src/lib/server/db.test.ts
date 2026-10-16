import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { db } from "./db.ts";

describe("db", () => {
  it("runs a query", async () => {
    const { rows } = await sql<{ one: number }>`select 1 as one`.execute(db);
    expect(rows).toEqual([{ one: 1 }]);
  });

  it("is an in-memory database under test, not the dev file from .env", async () => {
    const { rows } = await sql<{
      file: string;
    }>`select file from pragma_database_list where name = 'main'`.execute(db);
    expect(rows).toEqual([{ file: "" }]);
  });

  it("leaves JSON-looking user text as a string", async () => {
    const { rows } = await sql<{ note: string }>`select '[1, 2]' as note`.execute(db);
    expect(rows).toEqual([{ note: "[1, 2]" }]);
  });
});
