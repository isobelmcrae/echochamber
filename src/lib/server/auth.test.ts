import { describe, expect, it } from "vitest";
import { auth } from "./auth.ts";
import { findByUsername } from "./invites.ts";

let accountId = 0;

/** Sign up through an OAuth provider the way Better Auth's callback does. */
async function oauthSignUp(user: { name: string; email: string; username?: string }) {
  const ctx = await auth.$context;
  const { user: created } = await ctx.internalAdapter.createOAuthUser(
    { ...user, emailVerified: true },
    { providerId: "github", accountId: String(++accountId) },
  );
  return created as typeof created & { username: string };
}

describe("OAuth sign-up", () => {
  it("gives the user a username from their email, so friends can invite them", async () => {
    const user = await oauthSignUp({ name: "Carol", email: "carol.smith@example.test" });
    expect(user.username).toBe("carol.smith");
    expect((await findByUsername("@carol.smith")).id).toBe(user.id);
  });

  it("keeps the provider's username (e.g. a GitHub login), lowercased", async () => {
    const user = await oauthSignUp({ name: "D", email: "d@example.test", username: "DaveOnGH" });
    expect(user.username).toBe("daveongh");
  });

  it("picks a free username when the natural one is taken", async () => {
    await oauthSignUp({ name: "Erin", email: "erin@one.example.test" });
    const second = await oauthSignUp({ name: "Erin", email: "erin@two.example.test" });
    const third = await oauthSignUp({ name: "Erin", email: "erin@three.example.test" });
    expect(second.username).toBe("erin2");
    expect(third.username).toBe("erin3");
  });

  it("makes a valid username out of anything", async () => {
    const odd = await oauthSignUp({ name: "F", email: "f-g+tag@example.test" });
    expect(odd.username).toBe("f_g_tag");
    const short = await oauthSignUp({ name: "G", email: "g@example.test" });
    expect(short.username).toMatch(/^[a-z0-9_.]{3,30}$/);
    const long = await oauthSignUp({ name: "H", email: `${"h".repeat(40)}@example.test` });
    expect(long.username).toBe("h".repeat(30));
  });
});
