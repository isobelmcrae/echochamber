import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteLink,
  editLinkNote,
  getLink,
  listLinks,
  listQueue,
  markSeen,
  postLink,
} from "./links.ts";
import { createRoom, listRooms, markRead } from "./rooms.ts";
import { addMember, createUser } from "./test-utils.ts";

async function setup() {
  const [alice, bob] = [await createUser("alice"), await createUser("bob")];
  const roomId = await createRoom(alice.id, { title: "Reels" });
  await addMember(roomId, bob.id, "member");
  return { alice, bob, roomId };
}

describe("links", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());
  const tick = () => vi.setSystemTime(Date.now() + 1000);

  it("posts a normalized link with a note and a pending preview", async () => {
    const { alice, roomId } = await setup();
    const { id } = await postLink(alice.id, roomId, {
      url: "instagram.com/reel/XYZ/?igsh=abc",
      note: "  you'll love this  ",
    });
    const link = await getLink(alice.id, id);
    expect(link).toMatchObject({
      url: "https://instagram.com/reel/XYZ/",
      note: "you'll love this",
      author: { name: "alice" },
      preview: { status: "pending" },
      comment_count: 0,
    });
  });

  it("rejects things that aren't web links", async () => {
    const { alice, roomId } = await setup();
    await expect(postLink(alice.id, roomId, { url: "javascript:alert(1)" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("is only visible to and postable by members", async () => {
    const { alice, roomId } = await setup();
    const outsider = await createUser();
    const { id } = await postLink(alice.id, roomId, { url: "https://example.com" });
    await expect(
      postLink(outsider.id, roomId, { url: "https://example.com" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(getLink(outsider.id, id)).rejects.toMatchObject({ status: 404 });
    await expect(listLinks(outsider.id, roomId)).rejects.toMatchObject({ status: 404 });
  });

  it("lists a room's links newest first, paging with a cursor", async () => {
    const { alice, bob, roomId } = await setup();
    const ids = [];
    for (let i = 0; i < 5; i++) {
      tick();
      ids.push(
        (await postLink(i % 2 ? bob.id : alice.id, roomId, { url: `https://example.com/${i}` })).id,
      );
    }
    const first = await listLinks(alice.id, roomId, { limit: 3 });
    expect(first.links.map((l) => l.id)).toEqual([ids[4], ids[3], ids[2]]);
    const second = await listLinks(alice.id, roomId, { limit: 3, cursor: first.nextCursor! });
    expect(second.links.map((l) => l.id)).toEqual([ids[1], ids[0]]);
    expect(second.nextCursor).toBeNull();
  });

  it("bumps the room to the top of everyone's list", async () => {
    const { alice, bob, roomId } = await setup();
    tick();
    const other = await createRoom(bob.id, { title: "other" });
    tick();
    await postLink(alice.id, roomId, { url: "https://example.com" });
    expect((await listRooms(bob.id)).map((r) => r.id)).toEqual([roomId, other]);
  });

  it("lets only the author edit the note", async () => {
    const { alice, bob, roomId } = await setup();
    const { id } = await postLink(alice.id, roomId, { url: "https://example.com", note: "old" });
    await expect(editLinkNote(bob.id, id, "hijacked")).rejects.toMatchObject({ status: 403 });
    await editLinkNote(alice.id, id, "new");
    const link = await getLink(bob.id, id);
    expect(link.note).toBe("new");
    expect(link.edited_at).not.toBeNull();
  });

  it("can be deleted by its author or an admin, not other members", async () => {
    const { alice, bob, roomId } = await setup();
    const carol = await createUser();
    await addMember(roomId, carol.id, "member");
    const byBob = await postLink(bob.id, roomId, { url: "https://example.com/1" });
    const byBob2 = await postLink(bob.id, roomId, { url: "https://example.com/2" });
    await expect(deleteLink(carol.id, byBob.id)).rejects.toMatchObject({ status: 403 });
    await deleteLink(bob.id, byBob.id);
    await deleteLink(alice.id, byBob2.id);
    expect((await listLinks(alice.id, roomId)).links).toEqual([]);
  });
});

describe("queue", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());
  const tick = () => vi.setSystemTime(Date.now() + 1000);
  const queueUrls = async (userId: string) =>
    (await listQueue(userId)).map((g) => [g.room.title, g.links.map((l) => l.url)]);

  it("groups unseen links by room, the room with the newest one first, each oldest first", async () => {
    const [alice, bob] = [await createUser("alice"), await createUser("bob")];
    const rooms: string[] = [];
    for (const title of ["one", "two", "three"]) {
      const id = await createRoom(alice.id, { title });
      await addMember(id, bob.id, "member");
      await markRead(bob.id, id);
      rooms.push(id);
    }
    const [one, two, three] = rooms as [string, string, string];
    const post = async (roomId: string, path: string) => {
      tick();
      await postLink(alice.id, roomId, { url: `https://example.com/${path}` });
    };
    await post(one, "1a");
    await post(three, "3a");
    await post(two, "2a");
    await post(three, "3b");
    await post(one, "1b");
    await post(three, "3c");
    await post(two, "2b");

    expect(await queueUrls(bob.id)).toEqual([
      ["two", ["https://example.com/2a", "https://example.com/2b"]],
      ["three", ["https://example.com/3a", "https://example.com/3b", "https://example.com/3c"]],
      ["one", ["https://example.com/1a", "https://example.com/1b"]],
    ]);
    // Your own links are never news to you.
    expect(await queueUrls(alice.id)).toEqual([]);
  });

  it("drops links once seen, or once their room is read, and counts them out of unread", async () => {
    const { alice, bob, roomId } = await setup();
    const other = await createRoom(alice.id, { title: "Other" });
    await addMember(other, bob.id, "member");
    await markRead(bob.id, roomId);
    await markRead(bob.id, other);
    tick();
    const a = await postLink(alice.id, roomId, { url: "https://example.com/a" });
    tick();
    await postLink(alice.id, roomId, { url: "https://example.com/b" });
    tick();
    await postLink(alice.id, other, { url: "https://example.com/c" });

    await markSeen(bob.id, a.id);
    await markSeen(bob.id, a.id); // idempotent
    expect(await queueUrls(bob.id)).toEqual([
      ["Other", ["https://example.com/c"]],
      ["Reels", ["https://example.com/b"]],
    ]);
    expect((await listRooms(bob.id)).find((r) => r.id === roomId)?.unread).toBe(1);

    tick();
    await markRead(bob.id, roomId);
    expect(await queueUrls(bob.id)).toEqual([["Other", ["https://example.com/c"]]]);
  });

  it("only lets members mark a link seen", async () => {
    const { alice, roomId } = await setup();
    const stranger = await createUser();
    const { id } = await postLink(alice.id, roomId, { url: "https://example.com/a" });
    await expect(markSeen(stranger.id, id)).rejects.toMatchObject({ status: 404 });
  });
});
