import { afterEach, describe, expect, it, vi } from "vitest";
import { userChanges } from "./events.ts";
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
      title: "A video",
      description: null,
      image_url: "https://img.test/x.jpg",
      site_name: "Tube",
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
