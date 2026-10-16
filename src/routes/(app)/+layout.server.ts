import { error } from "@sveltejs/kit";

export function load({ locals }) {
  // hooks.server.ts sends signed-out visitors to /login before this runs.
  const { user } = locals;
  if (!user) error(401, "Sign in first");
  return { me: { id: user.id, name: user.name, username: user.username ?? user.name } };
}
