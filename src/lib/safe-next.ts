/** A same-origin path to return to after sign-in, or "/" for anything else. */
export function safeNext(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
