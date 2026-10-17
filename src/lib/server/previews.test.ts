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
      frameable: true,
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
    vi.spyOn(unfurl, "unfurl").mockResolvedValue({ preview: null, frameable: false });
    const { alice, id } = await linkWith("https://locked.test/1");
    await ensurePreview("https://locked.test/1");
    expect((await getLink(alice.id, id)).preview).toMatchObject({
      status: "failed",
      frameable: 0,
    });
  });

  it("keeps the last good preview when fetching it again fails", async () => {
    const spy = vi.spyOn(unfurl, "unfurl").mockResolvedValue({
      preview: { title: "Kept", description: null, image_url: null, site_name: null },
      frameable: true,
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
      frameable: 1,
    });
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
