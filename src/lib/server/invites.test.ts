import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptInvite,
  cancelInvite,
  createInviteLink,
  declineInvite,
  inviteByUsername,
  listInviteLinks,
  listMyInvites,
  listRoomInvites,
  previewInviteLink,
  redeemInviteLink,
  revokeInviteLink,
} from "./invites.ts";
import { createRoom, getRoom, listRooms } from "./rooms.ts";
import { addMember, createUser } from "./test-utils.ts";

async function setup() {
  const [alice, bob] = [await createUser("alice"), await createUser("bob")];
  const roomId = await createRoom(alice.id, { title: "Reels" });
  return { alice, bob, roomId };
}

describe("username invites", () => {
  it("shows the invite to the invitee, who joins by accepting", async () => {
    const { alice, bob, roomId } = await setup();
    await inviteByUsername(alice.id, roomId, bob.username.toUpperCase());
    const [invite] = await listMyInvites(bob.id);
    expect(invite).toMatchObject({ room_id: roomId, title: "Reels", inviter_name: "alice" });
    await expect(getRoom(roomId, bob.id)).rejects.toMatchObject({ status: 404 });

    await acceptInvite(bob.id, roomId);
    expect((await getRoom(roomId, bob.id)).role).toBe("member");
    expect(await listMyInvites(bob.id)).toEqual([]);
  });

  it("treats accepting twice and inviting twice as no-ops", async () => {
    const { alice, bob, roomId } = await setup();
    await inviteByUsername(alice.id, roomId, bob.username);
    await inviteByUsername(alice.id, roomId, bob.username);
    expect(await listMyInvites(bob.id)).toHaveLength(1);
    await acceptInvite(bob.id, roomId);
    await expect(acceptInvite(bob.id, roomId)).resolves.toBeUndefined();
  });

  it("can't be accepted without an invite", async () => {
    const { bob, roomId } = await setup();
    await expect(acceptInvite(bob.id, roomId)).rejects.toMatchObject({ status: 404 });
  });

  it("is declined or cancelled by deleting it", async () => {
    const { alice, bob, roomId } = await setup();
    const carol = await createUser("carol");
    await inviteByUsername(alice.id, roomId, bob.username);
    await inviteByUsername(alice.id, roomId, carol.username);
    await declineInvite(bob.id, roomId);
    await cancelInvite(alice.id, roomId, carol.id);
    expect(await listRoomInvites(alice.id, roomId)).toEqual([]);
    expect(await listRooms(bob.id)).toEqual([]);
  });

  it("is only for admins, and rejects unknown users and existing members", async () => {
    const { alice, bob, roomId } = await setup();
    const carol = await createUser("carol");
    await addMember(roomId, bob.id, "member");
    await expect(inviteByUsername(bob.id, roomId, carol.username)).rejects.toMatchObject({
      status: 403,
    });
    await expect(inviteByUsername(alice.id, roomId, "nobody_here")).rejects.toMatchObject({
      status: 404,
    });
    await expect(inviteByUsername(alice.id, roomId, bob.username)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("invite links", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("lets anyone with the link join, once", async () => {
    const { alice, bob, roomId } = await setup();
    const { token } = await createInviteLink(alice.id, roomId, {});
    await expect(previewInviteLink(token)).resolves.toMatchObject({
      room_id: roomId,
      title: "Reels",
    });
    await expect(redeemInviteLink(bob.id, token)).resolves.toBe(roomId);
    await expect(redeemInviteLink(bob.id, token)).resolves.toBe(roomId);
    expect((await getRoom(roomId, bob.id)).role).toBe("member");
    expect((await listInviteLinks(alice.id, roomId))[0]?.use_count).toBe(1);
  });

  it("clears a pending username invite when the user joins by link", async () => {
    const { alice, bob, roomId } = await setup();
    await inviteByUsername(alice.id, roomId, bob.username);
    const { token } = await createInviteLink(alice.id, roomId, {});
    await redeemInviteLink(bob.id, token);
    expect(await listMyInvites(bob.id)).toEqual([]);
  });

  it("stops working once expired, used up, or revoked", async () => {
    const { alice, roomId } = await setup();
    const [u1, u2, u3] = [await createUser(), await createUser(), await createUser()];

    const expiring = await createInviteLink(alice.id, roomId, { expiresInHours: 1 });
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    await expect(redeemInviteLink(u1.id, expiring.token)).rejects.toMatchObject({ status: 410 });

    const single = await createInviteLink(alice.id, roomId, { maxUses: 1 });
    await redeemInviteLink(u1.id, single.token);
    await expect(redeemInviteLink(u2.id, single.token)).rejects.toMatchObject({ status: 410 });

    const revoked = await createInviteLink(alice.id, roomId, {});
    await revokeInviteLink(alice.id, roomId, revoked.id);
    await expect(redeemInviteLink(u3.id, revoked.token)).rejects.toMatchObject({ status: 410 });
    await expect(previewInviteLink(revoked.token)).rejects.toMatchObject({ status: 410 });
    await expect(previewInviteLink("not-a-token")).rejects.toMatchObject({ status: 404 });
  });

  it("are created, listed and revoked by admins only", async () => {
    const { alice, bob, roomId } = await setup();
    await addMember(roomId, bob.id, "member");
    await expect(createInviteLink(bob.id, roomId, {})).rejects.toMatchObject({ status: 403 });
    await expect(listInviteLinks(bob.id, roomId)).rejects.toMatchObject({ status: 403 });
    const link = await createInviteLink(alice.id, roomId, {});
    await expect(revokeInviteLink(bob.id, roomId, link.id)).rejects.toMatchObject({ status: 403 });
  });

  it("only lists links that still work", async () => {
    const { alice, roomId } = await setup();
    const live = await createInviteLink(alice.id, roomId, {});
    const revoked = await createInviteLink(alice.id, roomId, {});
    await revokeInviteLink(alice.id, roomId, revoked.id);
    expect((await listInviteLinks(alice.id, roomId)).map((l) => l.id)).toEqual([live.id]);
  });
});

describe("starting a room with someone", () => {
  it("invites them as an admin", async () => {
    const { alice, bob, roomId } = await setup();
    await inviteByUsername(alice.id, roomId, bob.username, "admin");
    await acceptInvite(bob.id, roomId);
    expect((await getRoom(roomId, bob.id)).role).toBe("admin");
  });
});
