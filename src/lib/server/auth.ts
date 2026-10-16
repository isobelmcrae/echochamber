import { betterAuth } from "better-auth";
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
  plugins: [sveltekitCookies(getRequestEvent)], // must stay last
});
