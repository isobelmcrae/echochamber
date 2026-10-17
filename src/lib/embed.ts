/** How a shared link is shown in the link viewer. */
export type Embed =
  | { kind: "frame"; src: string; shape: "video" | "vertical" | "audio" | "page" }
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "none" }
  | { kind: "broken" };

/** What fetching a link's page found: whether it may be framed, or that it doesn't resolve. */
export type PageStatus = "frameable" | "unframeable" | "broken";

type Provider = { host: RegExp; embed: (url: URL) => Embed | null };

const YOUTUBE_ID = /^[\w-]{11}$/;

/** YouTube's `t` parameter, as seconds: "42", "42s" or "1h2m3s". */
function seconds(t: string | null) {
  const m = t ? /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t) : null;
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function youtube(url: URL): Embed | null {
  const path = url.pathname.split("/").filter(Boolean);
  const [id, shape] =
    url.hostname === "youtu.be"
      ? [path[0], "video"]
      : path[0] === "watch"
        ? [url.searchParams.get("v"), "video"]
        : path[0] === "shorts"
          ? [path[1], "vertical"]
          : path[0] === "embed" || path[0] === "live"
            ? [path[1], "video"]
            : [];
  if (!id || !YOUTUBE_ID.test(id)) return null;
  const start = seconds(url.searchParams.get("t"));
  return {
    kind: "frame",
    src: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`,
    shape: shape as "video" | "vertical",
  };
}

/** Sites whose pages refuse to be framed but offer an embeddable player. */
const PROVIDERS: Provider[] = [
  { host: /^((www|m)\.)?youtube\.com$|^youtu\.be$/, embed: youtube },
  {
    host: /^(www\.)?vimeo\.com$/,
    embed: (url) => {
      const id = /^\/(\d+)/.exec(url.pathname)?.[1];
      return id
        ? { kind: "frame", src: `https://player.vimeo.com/video/${id}`, shape: "video" }
        : null;
    },
  },
  {
    host: /^open\.spotify\.com$/,
    embed: (url) => {
      const m = /^\/(track|album|playlist|episode|show|artist)\/(\w+)/.exec(url.pathname);
      return m
        ? { kind: "frame", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, shape: "audio" }
        : null;
    },
  },
  {
    host: /^(www\.)?tiktok\.com$/,
    embed: (url) => {
      const id = /\/video\/(\d+)/.exec(url.pathname)?.[1];
      return id
        ? { kind: "frame", src: `https://www.tiktok.com/embed/v2/${id}`, shape: "vertical" }
        : null;
    },
  },
  {
    host: /^(www\.)?instagram\.com$/,
    embed: (url) => {
      const m = /^\/(p|reel|tv)\/([\w-]+)/.exec(url.pathname);
      return m
        ? {
            kind: "frame",
            src: `https://www.instagram.com/${m[1]}/${m[2]}/embed`,
            shape: "vertical",
          }
        : null;
    },
  },
  {
    host: /^((www|mobile)\.)?(twitter|x)\.com$/,
    embed: (url) => {
      const id = /^\/\w+\/status\/(\d+)/.exec(url.pathname)?.[1];
      return id
        ? {
            kind: "frame",
            src: `https://platform.twitter.com/embed/Tweet.html?id=${id}`,
            shape: "vertical",
          }
        : null;
    },
  },
];

const IMAGE = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const VIDEO = /\.(mp4|webm|mov)$/i;

/**
 * Pick how to show a link: a provider's player, the file itself, or the page in
 * a frame. `page` is what fetching its preview found; unknown pages get a frame.
 */
export function embedFor(href: string, { page }: { page?: PageStatus | null } = {}): Embed {
  // A frame or player would only show the browser's (or the player's) error.
  if (page === "broken") return { kind: "broken" };
  const url = new URL(href);
  const provider = PROVIDERS.find((p) => p.host.test(url.hostname));
  const embed = provider?.embed(url);
  if (embed) return embed;
  if (IMAGE.test(url.pathname)) return { kind: "image", src: href };
  if (VIDEO.test(url.pathname)) return { kind: "video", src: href };
  // The app is served over https, which blocks http frames as mixed content.
  if (url.protocol !== "https:" || page === "unframeable") return { kind: "none" };
  return { kind: "frame", src: href, shape: "page" };
}
