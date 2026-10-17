import { afterEach, describe, expect, it, vi } from "vitest";
import { userChanges } from "./events.ts";
import { db } from "./db.ts";
import { getLink, postLink } from "./links.ts";
import { ensurePreview } from "./previews.ts";
import { createRoom } from "./rooms.ts";
import { createUser } from "./test-utils.ts";
import * as unfurl from "./unfurl.ts";

async function linkWith(url: string) {
  const alice = await createUser();
  const roomId = await createRoom(alice.id, {});
  const { id } = await postLink(alice.id, roomId, { url });
  return { alice, roomId, id };
}

describe("ensurePreview", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stores the unfurled preview and tells the room", async () => {
    vi.spyOn(unfurl, "unfurl").mockResolvedValue({
      preview: {
        title: "A video",
        description: null,
        image_url: "https://img.test/x.jpg",
        site_name: "Tube",
      },
      page: "frameable",
    });
    const { alice, id } = await linkWith("https://video.test/1");
    const abort = new AbortController();
    const roomEvents = userChanges(alice.id, abort.signal)[Symbol.asyncIterator]();
    await roomEvents.next();
    const notified = roomEvents.next();

    await ensurePreview("https://video.test/1");
    expect((await getLink(alice.id, id)).preview).toMatchObject({ status: "ok", title: "A video" });
    await expect(notified).resolves.toMatchObject({ done: false });
    abort.abort();
  });

  it("remembers whether the page can be framed, even without a usable preview", async () => {
    vi.spyOn(unfurl, "unfurl").mockResolvedValue({ preview: null, page: "unframeable" });
    const { alice, id } = await linkWith("https://locked.test/1");
    await ensurePreview("https://locked.test/1");
    expect((await getLink(alice.id, id)).preview).toMatchObject({
      status: "failed",
      page_status: "unframeable",
    });
  });

  it("marks a link broken once its page stops resolving, keeping its preview", async () => {
    const spy = vi.spyOn(unfurl, "unfurl").mockResolvedValue({
      preview: { title: "Was here", description: null, image_url: null, site_name: null },
      page: "frameable",
    });
    const { alice, id } = await linkWith("https://rot.test/1");
    await ensurePreview("https://rot.test/1");

    spy.mockResolvedValue({ preview: null, page: "broken" });
    await db
      .updateTable("link_preview")
      .set({ status: "pending" })
      .where("url", "=", "https://rot.test/1")
      .execute();
    await ensurePreview("https://rot.test/1");
    expect((await getLink(alice.id, id)).preview).toMatchObject({
      status: "ok",
      title: "Was here",
      page_status: "broken",
    });
  });

  it("keeps the last good preview when fetching it again fails", async () => {
    const spy = vi.spyOn(unfurl, "unfurl").mockResolvedValue({
      preview: { title: "Kept", description: null, image_url: null, site_name: null },
      page: "frameable",
    });
    const { alice, id } = await linkWith("https://flaky.test/1");
    await ensurePreview("https://flaky.test/1");

    spy.mockRejectedValue(new Error("down"));
    await db
      .updateTable("link_preview")
      .set({ status: "pending" })
      .where("url", "=", "https://flaky.test/1")
      .execute();
    await ensurePreview("https://flaky.test/1");
    expect((await getLink(alice.id, id)).preview).toMatchObject({
      status: "ok",
      title: "Kept",
      page_status: "frameable",
    });
  });

  // Each fetch has its own deadline, so fetches queued behind each other (for a
  // DNS thread, say) mustn't all start at once, as on startup.
  it("fetches a few previews at a time", async () => {
    let running = 0;
    let most = 0;
    vi.spyOn(unfurl, "unfurl").mockImplementation(async () => {
      most = Math.max(most, ++running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return { preview: null, page: "broken" };
    });
    const urls = Array.from({ length: 12 }, (_, i) => `https://herd.test/${i}`);
    for (const url of urls) await linkWith(url);
    await Promise.all(urls.map(ensurePreview));
    expect(most).toBe(4);
  });

  it("marks failures, and only retries them once they're a day old", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const spy = vi.spyOn(unfurl, "unfurl").mockRejectedValue(new Error("blocked"));
    const { alice, id } = await linkWith("https://blocked.test/1");
    await ensurePreview("https://blocked.test/1");
    expect((await getLink(alice.id, id)).preview?.status).toBe("failed");

    spy.mockClear();
    await ensurePreview("https://blocked.test/1");
    expect(spy).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    await ensurePreview("https://blocked.test/1");
    expect(spy).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
