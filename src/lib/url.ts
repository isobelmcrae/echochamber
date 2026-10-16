const TRACKING = /^(utm_.*|fbclid|gclid|igsh|igshid|si|mc_eid|ref_src)$/i;

/**
 * A shared link in canonical form: http(s) only, no fragment, no tracking
 * parameters. Returns null for anything that isn't a web link.
 */
export function normalizeUrl(input: string) {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  url.hash = "";
  // Copy the keys first: deleting while iterating the live iterator skips entries.
  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}
