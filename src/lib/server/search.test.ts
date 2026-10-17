import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addComment, deleteComment, editComment } from "./comments.ts";
import { db } from "./db.ts";
import { deleteLink, editLinkNote, postLink, searchLinks } from "./links.ts";
import { createRoom } from "./rooms.ts";
import { addMember, createUser } from "./test-utils.ts";

async function setup() {
  const [alice, bob] = [await createUser("alice"), await createUser("bob")];
  const roomId = await createRoom(alice.id, { title: "Reels" });
  await addMember(roomId, bob.id, "member");
  return { alice, bob, roomId };
}

const urls = async (userId: string, q: string) => (await searchLinks(userId, q)).map((l) => l.url);

describe("searchLinks", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("finds links by a substring of their note or URL, ignoring case", async () => {
    const { alice, roomId } = await setup();
    await postLink(alice.id, roomId, { url: "https://example.com/a", note: "Best Lasagna ever" });
    await postLink(alice.id, roomId, { url: "https://youtube.com/watch?v=xyz" });
    expect(await urls(alice.id, "lasag")).toEqual(["https://example.com/a"]);
    expect(await urls(alice.id, "YOUTUBE")).toEqual(["https://youtube.com/watch?v=xyz"]);
  });

  it("finds links by their preview, once it's fetched", async () => {
    const { alice, roomId } = await setup();
    const { url } = await postLink(alice.id, roomId, { url: "https://example.com/a" });
    expect(await urls(alice.id, "otters")).toEqual([]);
    await db
      .updateTable("link_preview")
      .set({ status: "ok", title: "Otters holding hands", site_name: "Nature" })
      .where("url", "=", url)
      .execute();
    expect(await urls(alice.id, "otters")).toEqual([url]);
  });

  it("finds links by who posted them", async () => {
    const { alice, bob, roomId } = await setup();
    await postLink(alice.id, roomId, { url: "https://example.com/a" });
    await postLink(bob.id, roomId, { url: "https://example.com/b" });
    expect(await urls(alice.id, bob.username)).toEqual(["https://example.com/b"]);
  });

  it("follows posters and commenters when they're renamed", async () => {
    const { alice, bob, roomId } = await setup();
    const a = await postLink(alice.id, roomId, { url: "https://example.com/a" });
    await addComment(bob.id, a.id, { body: "nice" });
    for (const id of [alice.id, bob.id]) {
      await db
        .updateTable("user")
        .set({ name: `renamed${id}` })
        .where("id", "=", id)
        .execute();
    }
    expect(await urls(alice.id, `renamed${alice.id}`)).toEqual([a.url]);
    expect(await urls(alice.id, `renamed${bob.id}`)).toEqual([a.url]);
  });

  it("finds links by their comments and commenters, ranking the poster first", async () => {
    const { alice, bob, roomId } = await setup();
    const a = await postLink(alice.id, roomId, { url: "https://example.com/a" });
    await postLink(bob.id, roomId, { url: "https://example.com/b" });
    await addComment(bob.id, a.id, { body: "this is the funniest thing" });
    expect(await urls(alice.id, "funniest")).toEqual([a.url]);
    expect(await urls(alice.id, "bob")).toEqual(["https://example.com/b", a.url]);
  });

  it("highlights the comment that matched", async () => {
    const { alice, bob, roomId } = await setup();
    const a = await postLink(alice.id, roomId, { url: "https://example.com/a", note: "a cat" });
    await addComment(bob.id, a.id, { body: "wonderful" });
    const [byComment] = await searchLinks(alice.id, "wonder");
    expect(byComment?.comment_match).toBe("\u0002wonder\u0003ful");
    const [byNote] = await searchLinks(alice.id, "cat");
    expect(byNote?.comment_match).toBeNull();
  });

  it("keeps up with edits and deletes", async () => {
    const { alice, bob, roomId } = await setup();
    const a = await postLink(alice.id, roomId, { url: "https://example.com/e", note: "stale" });
    await editLinkNote(alice.id, a.id, "brand new");
    expect(await urls(alice.id, "stale")).toEqual([]);
    expect(await urls(alice.id, "brand")).toEqual([a.url]);

    const c = await addComment(bob.id, a.id, { body: "first take" });
    await editComment(bob.id, c.id, "second take");
    expect(await urls(alice.id, "first")).toEqual([]);
    expect(await urls(alice.id, "second")).toEqual([a.url]);
    await deleteComment(bob.id, c.id);
    expect(await urls(alice.id, "second")).toEqual([]);

    await deleteLink(alice.id, a.id);
    expect(await urls(alice.id, "brand")).toEqual([]);
  });

  it("only searches the user's rooms", async () => {
    const { alice, roomId } = await setup();
    const stranger = await createUser();
    await createRoom(stranger.id, { title: "Elsewhere" });
    await postLink(alice.id, roomId, { url: "https://example.com/secret" });
    expect(await urls(stranger.id, "secret")).toEqual([]);
  });

  it("treats the query as plain words: each must match, short ones and syntax ignored", async () => {
    const { alice, roomId } = await setup();
    await postLink(alice.id, roomId, { url: "https://example.com/a", note: "red panda" });
    await postLink(alice.id, roomId, { url: "https://example.com/b", note: "red fox" });
    expect(await urls(alice.id, "red panda")).toEqual(["https://example.com/a"]);
    expect(await urls(alice.id, 'pan" OR "fox')).toEqual([]);
    expect(await urls(alice.id, "a panda")).toEqual(["https://example.com/a"]);
    expect(await urls(alice.id, "  ab ")).toEqual([]);
  });
});
