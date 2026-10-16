import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { username } from "better-auth/plugins/username";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import * as env from "$app/env/private";
import { db } from "./db.ts";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: { db, type: "sqlite" },
  emailAndPassword: { enabled: true },
  advanced: { database: { joins: true } },
  plugins: [username(), sveltekitCookies(getRequestEvent)], // sveltekitCookies must stay last
});

/** Creates or updates Better Auth's tables. Idempotent; runs on startup before our migrations. */
export async function migrateAuth() {
  await (await getMigrations(auth.options)).runMigrations();
}
