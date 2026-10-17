import { error } from "@sveltejs/kit";
import { parseView, VIEW_COOKIE } from "#lib/view.ts";

export function load({ locals, cookies }) {
  // hooks.server.ts sends signed-out visitors to /login before this runs.
  const { user } = locals;
  if (!user) error(401, "Sign in first");
  return {
    me: {
      id: user.id,
      name: user.name,
      username: user.username ?? user.name,
      image: user.image ?? null,
    },
    view: parseView(cookies.get(VIEW_COOKIE)),
  };
}
