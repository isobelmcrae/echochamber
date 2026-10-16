import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addComment, deleteComment, editComment, listComments } from "./comments.ts";
import { getLink, postLink } from "./links.ts";
import { createRoom } from "./rooms.ts";
import { addMember, createUser } from "./test-utils.ts";

async function setup() {
  const [alice, bob] = [await createUser("alice"), await createUser("bob")];
  const roomId = await createRoom(alice.id, {});
  await addMember(roomId, bob.id, "member");
  const { id: linkId } = await postLink(alice.id, roomId, { url: "https://example.com" });
  return { alice, bob, roomId, linkId };
}

describe("comments", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());
  const tick = () => vi.setSystemTime(Date.now() + 1000);

  it("are listed chronologically with authors, and counted on the link", async () => {
    const { alice, bob, linkId } = await setup();
    await addComment(bob.id, linkId, { body: "first!" });
    tick();
    await addComment(alice.id, linkId, { body: "  second  " });
    const comments = await listComments(alice.id, linkId);
    expect(comments.map((c) => [c.author?.name, c.body])).toEqual([
      ["bob", "first!"],
      ["alice", "second"],
    ]);
    expect((await getLink(alice.id, linkId)).comment_count).toBe(2);
  });

  it("can reply to a comment on the same link only", async () => {
    const { alice, bob, roomId, linkId } = await setup();
    const parent = await addComment(alice.id, linkId, { body: "parent" });
    const reply = await addComment(bob.id, linkId, { body: "reply", parentId: parent.id });
    expect((await listComments(bob.id, linkId)).find((c) => c.id === reply.id)?.parent_id).toBe(
      parent.id,
    );

    const { id: otherLink } = await postLink(alice.id, roomId, { url: "https://example.com/2" });
    await expect(
      addComment(bob.id, otherLink, { body: "x", parentId: parent.id }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it("are only for members, and reject blank bodies", async () => {
    const { alice, linkId } = await setup();
    const outsider = await createUser();
    await expect(addComment(outsider.id, linkId, { body: "hi" })).rejects.toMatchObject({
      status: 404,
    });
    await expect(listComments(outsider.id, linkId)).rejects.toMatchObject({ status: 404 });
    await expect(addComment(alice.id, linkId, { body: "   " })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("can be edited by their author only", async () => {
    const { alice, bob, linkId } = await setup();
    const comment = await addComment(bob.id, linkId, { body: "typo" });
    await expect(editComment(alice.id, comment.id, "nope")).rejects.toMatchObject({ status: 403 });
    await editComment(bob.id, comment.id, "fixed");
    const [edited] = await listComments(bob.id, linkId);
    expect(edited).toMatchObject({ body: "fixed", edited_at: expect.any(Number) });
  });

  it("disappear when deleted without replies", async () => {
    const { bob, linkId } = await setup();
    const comment = await addComment(bob.id, linkId, { body: "oops" });
    await deleteComment(bob.id, comment.id);
    expect(await listComments(bob.id, linkId)).toEqual([]);
  });

  it("leave a tombstone when deleted with replies, cleaned up once the replies go", async () => {
    const { alice, bob, linkId } = await setup();
    const parent = await addComment(bob.id, linkId, { body: "secret" });
    tick();
    const reply = await addComment(alice.id, linkId, { body: "reply", parentId: parent.id });
    await deleteComment(bob.id, parent.id);

    const [tombstone] = await listComments(alice.id, linkId);
    expect(tombstone).toMatchObject({ id: parent.id, body: "", author: null, deleted: true });
    expect((await getLink(alice.id, linkId)).comment_count).toBe(1);
    await expect(editComment(bob.id, parent.id, "back")).rejects.toMatchObject({ status: 404 });

    await deleteComment(alice.id, reply.id);
    expect(await listComments(alice.id, linkId)).toEqual([]);
  });

  it("can be deleted by admins but not other members", async () => {
    const { alice, bob, roomId, linkId } = await setup();
    const carol = await createUser();
    await addMember(roomId, carol.id, "member");
    const comment = await addComment(bob.id, linkId, { body: "rude" });
    await expect(deleteComment(carol.id, comment.id)).rejects.toMatchObject({ status: 403 });
    await deleteComment(alice.id, comment.id);
    expect(await listComments(alice.id, linkId)).toEqual([]);
  });
});
