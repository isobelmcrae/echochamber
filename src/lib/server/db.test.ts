import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { db } from "./db.ts";

describe("db", () => {
  it("runs a query", async () => {
    const { rows } = await sql<{ one: number }>`select 1 as one`.execute(db);
    expect(rows).toEqual([{ one: 1 }]);
  });
});
