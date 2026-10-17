import { getRequestEvent, query } from "$app/server";
import { userChanges } from "#lib/server/events.ts";
import { requireUser } from "#lib/server/session.ts";

/**
 * The tab's one live stream: a fresh token after every change the signed-in
 * user can see. Every other read is a plain query that refreshes on it (see
 * `refreshOnChange`), since each live query holds a connection until it's
 * garbage collected.
 */
export const changes = query.live(() => {
  const me = requireUser();
  // Taken now, while the request is in scope.
  const { signal } = getRequestEvent().request;
  return (async function* () {
    for await (const _ of userChanges(me.id, signal)) yield crypto.randomUUID();
  })();
});
