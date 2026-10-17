import { untrack } from "svelte";
import { changes } from "#lib/remote/changes.remote.ts";

// One reference for the whole tab, so the stream stays open while pages come and
// go. Created on first use: effects only run in the browser.
let stream: ReturnType<typeof changes> | undefined;

/**
 * Refresh the queries a component reads whenever anything the signed-in user
 * can see changes. Call while the component initializes.
 */
export function refreshOnChange(queries: () => { refresh(): Promise<void> }[]) {
  let seen: string | undefined;
  $effect(() => {
    const token = (stream ??= changes()).current;
    if (!token) return;
    if (seen && token !== seen) untrack(() => queries().forEach((q) => void q.refresh()));
    seen = token;
  });
}
