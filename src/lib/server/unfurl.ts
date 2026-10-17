import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import { BlockList, isIP } from "node:net";

// Fetches link previews without letting users point the server at internal
// machines (SSRF): every connection, including each redirect hop, may only
// reach public addresses. The check runs in the socket's own DNS lookup, so a
// hostname can't resolve to something else between check and connect.

export type Preview = {
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
};

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3], // multicast and reserved, through 255.255.255.255
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export function isPublicAddress(ip: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (mapped) return isPublicAddress(mapped);
  const family = isIP(ip);
  if (family === 0) return false;
  return !blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

type FetchOptions = {
  /** Which resolved addresses may be contacted. Tests loosen this to reach a local server. */
  allow?: (ip: string) => boolean;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

const TEXT_TYPES = /^(text\/html|application\/xhtml\+xml|application\/json)/i;

/**
 * Whether a page's response lets another site show it in a frame. A CSP
 * `frame-ancestors` directive overrides X-Frame-Options; we're never the
 * page's own origin, so only a wildcard (or any https page) lets us in.
 */
export function allowsFraming(headers: IncomingHttpHeaders) {
  const policies = [headers["content-security-policy"] ?? []].flat().flatMap((h) => h.split(","));
  const ancestors = policies.flatMap((policy) => {
    const directive = policy
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .find(([name]) => name?.toLowerCase() === "frame-ancestors");
    return directive ? [directive.slice(1)] : [];
  });
  if (ancestors.length > 0) {
    return ancestors.every((sources) => sources.some((s) => s === "*" || s === "https:"));
  }
  const xfo = [headers["x-frame-options"] ?? []].flat().join(",").trim().toLowerCase();
  return xfo !== "deny" && xfo !== "sameorigin";
}

/**
 * GET a text resource from the public internet. Truncates at `maxBytes`. Also
 * reports whether the final page could be shown in a frame.
 */
export async function fetchText(
  url: string,
  {
    allow = isPublicAddress,
    timeoutMs = 5000,
    maxBytes = 512 * 1024,
    maxRedirects = 3,
  }: FetchOptions = {},
) {
  const deadline = Date.now() + timeoutMs;
  let current = new URL(url);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await request(current, allow, deadline, maxBytes);
    if (res.location) {
      current = new URL(res.location, current);
      continue;
    }
    return { url: current.href, body: res.body, frameable: allowsFraming(res.headers) };
  }
  throw new Error("Too many redirects");
}

function request(url: URL, allow: (ip: string) => boolean, deadline: number, maxBytes: number) {
  return new Promise<{ location?: string; body: string; headers: IncomingHttpHeaders }>(
    (resolve, reject) => {
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return reject(new Error(`Scheme ${url.protocol} is not allowed`));
      }
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (isIP(host) && !allow(host)) return reject(new Error(`Address ${host} is not allowed`));

      const lookup = (
        hostname: string,
        options: { all?: boolean },
        callback: (err: Error | null, address: string | LookupAddress[], family?: number) => void,
      ) => {
        dnsLookup(hostname, { all: true }, (err, addresses) => {
          if (err) return callback(err, []);
          const denied = addresses.find((a) => !allow(a.address));
          if (denied || addresses.length === 0) {
            return callback(new Error(`Address ${denied?.address ?? hostname} is not allowed`), []);
          }
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0]!.address, addresses[0]!.family);
        });
      };

      const client = url.protocol === "https:" ? https : http;
      const req = client.get(
        url,
        {
          lookup,
          headers: {
            "user-agent": "EchoChamberBot/1.0 (link previews)",
            accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1",
          },
          timeout: Math.max(1, deadline - Date.now()),
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume();
            return resolve({ location: res.headers.location, body: "", headers: res.headers });
          }
          if (status >= 400) {
            res.resume();
            return reject(new Error(`HTTP ${status}`));
          }
          if (!TEXT_TYPES.test(res.headers["content-type"] ?? "")) {
            res.resume();
            return reject(new Error(`Unsupported content type ${res.headers["content-type"]}`));
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            size += chunk.length;
            if (size >= maxBytes) {
              res.destroy();
              resolve({
                body: Buffer.concat(chunks).subarray(0, maxBytes).toString("utf8"),
                headers: res.headers,
              });
            }
          });
          res.on("end", () =>
            resolve({ body: Buffer.concat(chunks).toString("utf8"), headers: res.headers }),
          );
          res.on("error", reject);
        },
      );
      req.on("timeout", () => req.destroy(new Error("Request timed out")));
      req.on("error", reject);
    },
  );
}

// ── Parsing ────────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function clean(text: string | undefined, max: number) {
  const value = text && decode(text).replace(/\s+/g, " ").trim();
  return value ? value.slice(0, max) : null;
}

function httpUrl(value: string | null | undefined, base?: string) {
  if (!value) return null;
  try {
    const url = new URL(decode(value), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** OpenGraph / Twitter / plain HTML metadata from a page. */
export function parseMeta(html: string, baseUrl: string): Preview {
  const meta = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name: string) =>
      new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")
        .exec(tag)
        ?.slice(1)
        .find((v) => v !== undefined);
    const key = (attr("property") ?? attr("name"))?.toLowerCase();
    const content = attr("content");
    if (key && content !== undefined && !meta.has(key)) meta.set(key, content);
  }
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  return {
    title: clean(meta.get("og:title") ?? meta.get("twitter:title") ?? title, 300),
    description: clean(
      meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description"),
      500,
    ),
    image_url: httpUrl(meta.get("og:image") ?? meta.get("twitter:image"), baseUrl),
    site_name: clean(meta.get("og:site_name"), 100),
  };
}

// Sites whose pages don't carry usable metadata but offer oEmbed without a key.
const OEMBED = [
  { match: /^(www\.|m\.)?(youtube\.com|youtu\.be)$/, endpoint: "https://www.youtube.com/oembed" },
  { match: /^(www\.)?tiktok\.com$/, endpoint: "https://www.tiktok.com/oembed" },
];

export function oembedEndpoint(url: string) {
  const provider = OEMBED.find((p) => p.match.test(new URL(url).hostname));
  return provider ? `${provider.endpoint}?format=json&url=${encodeURIComponent(url)}` : null;
}

/**
 * Best-effort preview for a URL (null when nothing useful was found), and
 * whether the page may be framed (null when only oEmbed was asked, whose
 * sites the viewer shows through their own players). Throws on network errors.
 */
export async function unfurl(
  url: string,
): Promise<{ preview: Preview | null; frameable: boolean | null }> {
  const endpoint = oembedEndpoint(url);
  if (endpoint) {
    try {
      const data = JSON.parse((await fetchText(endpoint)).body) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : undefined);
      const preview = {
        title: clean(str(data.title), 300),
        description: str(data.author_name) ? `by ${str(data.author_name)}` : null,
        image_url: httpUrl(str(data.thumbnail_url)),
        site_name: clean(str(data.provider_name), 100),
      };
      return { preview, frameable: null };
    } catch {
      // Fall back to the page itself.
    }
  }
  const page = await fetchText(url);
  return {
    preview: usefulPreview(parseMeta(page.body, page.url), page.url),
    frameable: page.frameable,
  };
}

/** Null when a page only offers its site's name (e.g. Instagram behind a login wall). */
export function usefulPreview(meta: Preview, url: string) {
  const brand = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  const generic = !meta.title || meta.title.toLowerCase() === brand;
  return generic && !meta.image_url ? null : meta;
}
