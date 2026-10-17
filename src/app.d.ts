import type { auth } from "#lib/server/auth.ts";
import "unplugin-icons/types/svelte";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session?: typeof auth.$Infer.Session.session;
      user?: typeof auth.$Infer.Session.user;
    }
    // interface PageData {}
    interface PageState {
      /** The link open in the viewer, shown over a room's feed or the home queue via shallow routing. */
      linkId?: string;
    }
    // interface Platform {}
  }
}

export {};
