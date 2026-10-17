import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  allowsFraming,
  fetchText,
  isPublicAddress,
  oembedEndpoint,
  parseMeta,
  usefulPreview,
} from "./unfurl.ts";

describe("isPublicAddress", () => {
  it("allows public addresses", () => {
    expect(
      ["93.184.216.34", "1.1.1.1", "2606:4700::1111"].filter((ip) => !isPublicAddress(ip)),
    ).toEqual([]);
  });

  it("blocks loopback, private, link-local, CGNAT and mapped addresses", () => {
    const blocked = [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "::1",
      "::",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:10.0.0.1",
      "not-an-ip",
    ];
    expect(blocked.filter((ip) => isPublicAddress(ip))).toEqual([]);
  });
});

describe("parseMeta", () => {
  const base = "https://site.test/posts/1";

  it("reads OpenGraph tags, resolving relative images and decoding entities", () => {
    const html = `<html><head>
      <meta property="og:title" content="Tom &amp; Jerry&#39;s &quot;Day&quot;">
      <meta content="A short description" property="og:description" />
      <meta property="og:image" content="/img/cover.jpg">
      <meta property="og:site_name" content="Site">
      <title>Ignored</title></head></html>`;
    expect(parseMeta(html, base)).toEqual({
      title: `Tom & Jerry's "Day"`,
      description: "A short description",
      image_url: "https://site.test/img/cover.jpg",
      site_name: "Site",
    });
  });

  it("falls back to twitter tags, then <title> and meta description", () => {
    const html = `<title> Plain  page </title><meta name="description" content="desc">
      <meta name="twitter:image" content="https://cdn.test/x.png">`;
    expect(parseMeta(html, base)).toEqual({
      title: "Plain page",
      description: "desc",
      image_url: "https://cdn.test/x.png",
      site_name: null,
    });
  });

  it("drops non-http images", () => {
    const html = `<meta property="og:image" content="javascript:alert(1)">`;
    expect(parseMeta(html, base).image_url).toBeNull();
  });
});

describe("usefulPreview", () => {
  const meta = { title: null, description: null, image_url: null, site_name: null };

  it("drops pages that only offer the site's own name", () => {
    expect(
      usefulPreview({ ...meta, title: "Instagram" }, "https://www.instagram.com/reel/x/"),
    ).toBeNull();
    expect(usefulPreview(meta, "https://example.com")).toBeNull();
  });

  it("keeps real titles, or any image", () => {
    expect(
      usefulPreview({ ...meta, title: "Example Domain" }, "https://example.com"),
    ).not.toBeNull();
    const withImage = { ...meta, title: "Instagram", image_url: "https://cdn.test/x.jpg" };
    expect(usefulPreview(withImage, "https://instagram.com/p/1")).toEqual(withImage);
  });
});

describe("oembedEndpoint", () => {
  it("knows YouTube and TikTok", () => {
    expect(oembedEndpoint("https://www.youtube.com/watch?v=abc")).toBe(
      "https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc",
    );
    expect(oembedEndpoint("https://youtu.be/abc")).toMatch(/^https:\/\/www\.youtube\.com\/oembed/);
    expect(oembedEndpoint("https://www.tiktok.com/@a/video/1")).toMatch(
      /^https:\/\/www\.tiktok\.com\/oembed/,
    );
    expect(oembedEndpoint("https://example.com/watch")).toBeNull();
  });
});

describe("allowsFraming", () => {
  it("allows pages that say nothing", () => {
    expect(allowsFraming({})).toBe(true);
    expect(allowsFraming({ "content-security-policy": "default-src 'self'" })).toBe(true);
  });

  it("honours X-Frame-Options", () => {
    expect(allowsFraming({ "x-frame-options": "DENY" })).toBe(false);
    expect(allowsFraming({ "x-frame-options": " sameorigin " })).toBe(false);
    // Browsers ignore the obsolete ALLOW-FROM, so the page frames.
    expect(allowsFraming({ "x-frame-options": "ALLOW-FROM https://a.test" })).toBe(true);
  });

  it("honours CSP frame-ancestors over X-Frame-Options", () => {
    const csp = (v: string) => ({ "content-security-policy": v, "x-frame-options": "DENY" });
    expect(allowsFraming(csp("frame-ancestors 'none'"))).toBe(false);
    expect(allowsFraming(csp("default-src *; frame-ancestors 'self' https://a.test"))).toBe(false);
    expect(allowsFraming(csp("frame-ancestors *"))).toBe(true);
    expect(allowsFraming(csp("frame-ancestors https:"))).toBe(true);
  });

  it("needs every policy to allow it, and ignores report-only ones", () => {
    expect(
      allowsFraming({ "content-security-policy": ["frame-ancestors *", "frame-ancestors 'none'"] }),
    ).toBe(false);
    expect(allowsFraming({ "content-security-policy-report-only": "frame-ancestors 'none'" })).toBe(
      true,
    );
  });
});

describe("fetchText", () => {
  let server: Server;
  let origin: string;
  const localOnly = (ip: string) => ip === "127.0.0.1";

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/page")
        res.writeHead(200, { "content-type": "text/html" }).end("<title>hi</title>");
      else if (req.url === "/to-page") res.writeHead(302, { location: "/page" }).end();
      else if (req.url === "/to-locked") res.writeHead(302, { location: "/locked" }).end();
      else if (req.url === "/locked")
        res
          .writeHead(200, { "content-type": "text/html", "x-frame-options": "DENY" })
          .end("<title>locked</title>");
      else if (req.url === "/to-metadata")
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data" }).end();
      else if (req.url === "/loop") res.writeHead(302, { location: "/loop" }).end();
      else if (req.url === "/huge")
        res.writeHead(200, { "content-type": "text/html" }).end("x".repeat(600_000));
      else if (req.url === "/image") res.writeHead(200, { "content-type": "image/png" }).end("png");
      else if (req.url === "/slow") setTimeout(() => res.end("late"), 2000);
      else res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it("refuses private addresses by default", async () => {
    await expect(fetchText(`${origin}/page`)).rejects.toThrow(/not allowed/);
    await expect(fetchText("http://localhost:1/")).rejects.toThrow(/not allowed/);
  });

  it("follows redirects, re-checking each hop", async () => {
    await expect(fetchText(`${origin}/to-page`, { allow: localOnly })).resolves.toMatchObject({
      url: `${origin}/page`,
      body: "<title>hi</title>",
      frameable: true,
    });
    await expect(fetchText(`${origin}/to-metadata`, { allow: localOnly })).rejects.toThrow(
      /not allowed/,
    );
    await expect(fetchText(`${origin}/loop`, { allow: localOnly })).rejects.toThrow(/redirects/);
  });

  it("reports whether the final page may be framed", async () => {
    await expect(fetchText(`${origin}/to-locked`, { allow: localOnly })).resolves.toMatchObject({
      url: `${origin}/locked`,
      frameable: false,
    });
  });

  it("caps size and time, and skips non-text responses", async () => {
    const huge = await fetchText(`${origin}/huge`, { allow: localOnly });
    expect(huge.body.length).toBeLessThanOrEqual(512 * 1024);
    await expect(fetchText(`${origin}/image`, { allow: localOnly })).rejects.toThrow(
      /content type/,
    );
    await expect(fetchText(`${origin}/slow`, { allow: localOnly, timeoutMs: 200 })).rejects.toThrow(
      /timed out/,
    );
  });
});
