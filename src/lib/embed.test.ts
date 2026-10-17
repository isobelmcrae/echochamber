import { describe, expect, it } from "vitest";
import { embedFor } from "./embed.ts";

describe("embedFor", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("plays %s through YouTube's player", (url, id) => {
    expect(embedFor(url)).toEqual({
      kind: "frame",
      src: `https://www.youtube-nocookie.com/embed/${id}`,
      shape: "video",
    });
  });

  it("starts YouTube videos at the shared timestamp", () => {
    expect(embedFor("https://youtu.be/dQw4w9WgXcQ?t=42")).toMatchObject({
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42",
    });
    expect(embedFor("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s")).toMatchObject({
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=65",
    });
  });

  it("shows Shorts upright", () => {
    expect(embedFor("https://www.youtube.com/shorts/abcDEF12345")).toEqual({
      kind: "frame",
      src: "https://www.youtube-nocookie.com/embed/abcDEF12345",
      shape: "vertical",
    });
  });

  it("embeds Vimeo, Spotify, TikTok, Instagram and X posts", () => {
    expect(embedFor("https://vimeo.com/76979871")).toEqual({
      kind: "frame",
      src: "https://player.vimeo.com/video/76979871",
      shape: "video",
    });
    expect(embedFor("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toEqual({
      kind: "frame",
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      shape: "audio",
    });
    expect(embedFor("https://www.tiktok.com/@someone/video/7234567890123456789")).toEqual({
      kind: "frame",
      src: "https://www.tiktok.com/embed/v2/7234567890123456789",
      shape: "vertical",
    });
    expect(embedFor("https://www.instagram.com/reel/C1a2b3c4d5/")).toEqual({
      kind: "frame",
      src: "https://www.instagram.com/reel/C1a2b3c4d5/embed",
      shape: "vertical",
    });
    expect(embedFor("https://x.com/someone/status/1234567890")).toEqual({
      kind: "frame",
      src: "https://platform.twitter.com/embed/Tweet.html?id=1234567890",
      shape: "vertical",
    });
  });

  it("shows images and videos directly", () => {
    expect(embedFor("https://example.com/cat.JPG?w=200")).toEqual({
      kind: "image",
      src: "https://example.com/cat.JPG?w=200",
    });
    expect(embedFor("https://example.com/clip.mp4")).toEqual({
      kind: "video",
      src: "https://example.com/clip.mp4",
    });
  });

  it("frames any other https page as-is", () => {
    expect(embedFor("https://example.com/article")).toEqual({
      kind: "frame",
      src: "https://example.com/article",
      shape: "page",
    });
    expect(embedFor("https://www.youtube.com/@channel")).toMatchObject({ shape: "page" });
  });

  it("doesn't frame pages known to refuse it, but still plays their media", () => {
    expect(embedFor("https://github.com/sveltejs/kit", { page: "unframeable" })).toEqual({
      kind: "none",
    });
    expect(embedFor("https://example.com/cat.png", { page: "unframeable" })).toMatchObject({
      kind: "image",
    });
    expect(embedFor("https://vimeo.com/76979871", { page: "unframeable" })).toMatchObject({
      kind: "frame",
      shape: "video",
    });
    expect(embedFor("https://example.com/article", { page: "frameable" })).toMatchObject({
      shape: "page",
    });
  });

  it("shows nothing for links that don't resolve, whatever they point at", () => {
    for (const url of [
      "https://example.com/article",
      "https://example.com/cat.png",
      "https://vimeo.com/76979871",
    ]) {
      expect(embedFor(url, { page: "broken" })).toEqual({ kind: "broken" });
    }
  });

  // An https page can't frame plain http (mixed content), so there's nothing to show.
  it("doesn't frame plain http pages", () => {
    expect(embedFor("http://example.com/article")).toEqual({ kind: "none" });
  });
});
