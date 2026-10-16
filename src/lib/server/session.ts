import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";

/** The signed-in user, for remote functions and endpoints. */
export function requireUser() {
  const { user } = getRequestEvent().locals;
  if (!user) error(401, "Sign in first");
  return user;
}
