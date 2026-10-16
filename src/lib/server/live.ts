import { getRequestEvent } from "$app/server";
import { changes } from "./events.ts";

/**
 * Body for a `query.live` function: yields `load()` now and again after every
 * change on `topics`, until the client disconnects. Call it synchronously from
 * the live function so the request (and its abort signal) is still in scope.
 */
export function live<T>(topics: string[] | (() => Promise<string[]>), load: () => Promise<T>) {
  const { signal } = getRequestEvent().request;
  return (async function* () {
    const resolved = typeof topics === "function" ? await topics() : topics;
    for await (const _ of changes(resolved, signal)) yield await load();
  })();
}
