import { describe, expect, it } from "vitest";
import { db } from "./db.ts";
import { migrate } from "./migrate.ts";
import { createUser } from "./test-utils.ts";

describe("migrate", () => {
  it("is idempotent", async () => {
    await expect(migrate(db)).resolves.toBeUndefined();
  });

  it("creates app tables alongside Better Auth's, with usernames", async () => {
    const { id } = await createUser("alice");
    const user = await db
      .selectFrom("user")
      .select("username")
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    expect(user.username).toMatch(/^alice_\d+$/);
    await expect(db.selectFrom("room").select("personal_of").execute()).resolves.toEqual([
      { personal_of: id },
    ]);
  });
});
