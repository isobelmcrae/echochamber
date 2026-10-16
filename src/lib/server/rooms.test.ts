import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRoom,
  deleteRoom,
  getRoom,
  kickMember,
  leaveRoom,
  listRooms,
  renameRoom,
  setRole,
} from "./rooms.ts";
import { acceptInvite } from "./invites.ts";
import { addMember, createUser } from "./test-utils.ts";

describe("rooms", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("makes the creator the room's admin", async () => {
    const alice = await createUser("alice");
    const roomId = await createRoom(alice.id, { title: "Reels" });
    const room = await getRoom(roomId, alice.id);
    expect(room.title).toBe("Reels");
    expect(room.role).toBe("admin");
    expect(room.members.map((m) => [m.username, m.role])).toEqual([[alice.username, "admin"]]);
  });

  it("stores blank titles as null", async () => {
    const alice = await createUser();
    const roomId = await createRoom(alice.id, { title: "   " });
    expect((await getRoom(roomId, alice.id)).title).toBeNull();
  });

  it("lists only the rooms a user belongs to, most recently active first", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const first = await createRoom(alice.id, { title: "first" });
    const second = await createRoom(alice.id, { title: "second" });
    await createRoom(bob.id, { title: "bob's" });
    vi.setSystemTime(Date.now() + 1000);
    await renameRoom(alice.id, first, "first, renamed");
    expect((await listRooms(alice.id)).map((r) => r.id)).toEqual([first, second]);
  });

  it("lets admins rename, but not members", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(alice.id, {});
    await addMember(roomId, bob.id, "member");
    await expect(renameRoom(bob.id, roomId, "mine now")).rejects.toMatchObject({ status: 403 });
    await renameRoom(alice.id, roomId, "ours");
    expect((await getRoom(roomId, bob.id)).title).toBe("ours");
  });

  it("lets admins kick members, who then lose access", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(alice.id, {});
    await addMember(roomId, bob.id, "member");
    await expect(kickMember(bob.id, roomId, alice.id)).rejects.toMatchObject({ status: 403 });
    await kickMember(alice.id, roomId, bob.id);
    await expect(getRoom(roomId, bob.id)).rejects.toMatchObject({ status: 404 });
  });

  it("promotes and demotes, but never leaves a room without an admin", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(alice.id, {});
    await addMember(roomId, bob.id, "member");
    await expect(setRole(alice.id, roomId, alice.id, "member")).rejects.toMatchObject({
      status: 409,
    });
    await setRole(alice.id, roomId, bob.id, "admin");
    await setRole(alice.id, roomId, alice.id, "member");
    expect((await getRoom(roomId, alice.id)).role).toBe("member");
  });

  it("blocks the last admin from leaving while others remain", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(alice.id, {});
    await addMember(roomId, bob.id, "member");
    await expect(leaveRoom(alice.id, roomId)).rejects.toMatchObject({ status: 409 });
    await leaveRoom(bob.id, roomId);
    expect(await listRooms(bob.id)).toEqual([]);
  });

  it("deletes the room when its only member leaves", async () => {
    const alice = await createUser();
    const roomId = await createRoom(alice.id, {});
    await leaveRoom(alice.id, roomId);
    expect(await listRooms(alice.id)).toEqual([]);
  });

  it("lets only admins delete a room", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(alice.id, {});
    await addMember(roomId, bob.id, "member");
    await expect(deleteRoom(bob.id, roomId)).rejects.toMatchObject({ status: 403 });
    await deleteRoom(alice.id, roomId);
    expect(await listRooms(bob.id)).toEqual([]);
  });
});

describe("createRoom with someone", () => {
  it("creates the room and invites them as an admin", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(alice.id, { with: bob.username });
    await acceptInvite(bob.id, roomId);
    expect((await getRoom(roomId, bob.id)).role).toBe("admin");
  });

  it("creates nothing when the username is unknown", async () => {
    const alice = await createUser();
    await expect(createRoom(alice.id, { with: "nobody_here" })).rejects.toMatchObject({
      status: 404,
    });
    expect(await listRooms(alice.id)).toEqual([]);
  });
});
