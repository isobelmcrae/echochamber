import { building } from "$app/env";
import { redirect } from "@sveltejs/kit";
import type { ServerInit } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth, migrateAuth } from "#lib/server/auth.ts";
import { db } from "#lib/server/db.ts";
import { migrate } from "#lib/server/migrate.ts";
import { resumePendingPreviews } from "#lib/server/previews.ts";

export const init: ServerInit = async () => {
  if (building) return;
  await migrateAuth();
  await migrate(db);
  await resumePendingPreviews();
};

// Pages anyone can open. Remote functions and /api/auth guard themselves.
const PUBLIC = /^\/(login|signup|join\/[^/]+|api\/auth\/.*|_app\/.*)$/;

export async function handle({ event, resolve }) {
  const session = await auth.api.getSession({ headers: event.request.headers });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  const { pathname, search } = event.url;
  if (!session && !PUBLIC.test(pathname)) {
    redirect(303, `/login?next=${encodeURIComponent(pathname + search)}`);
  }

  return svelteKitHandler({ event, resolve, auth, building });
}
