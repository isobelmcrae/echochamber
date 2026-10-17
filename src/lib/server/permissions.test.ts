import { describe, expect, it } from "vitest";
import { db } from "./db.ts";
import { can, requireMember } from "./permissions.ts";
import { createUser } from "./test-utils.ts";

describe("can", () => {
  it("lets every role post links and comments", () => {
    expect(can("member", "link.create")).toBe(true);
    expect(can("member", "comment.create")).toBe(true);
    expect(can("admin", "link.create")).toBe(true);
  });

  it("reserves room management for admins", () => {
    for (const action of [
      "room.update",
      "member.invite",
      "member.kick",
      "member.setRole",
      "content.deleteAny",
    ] as const) {
      expect(can("member", action)).toBe(false);
      expect(can("admin", action)).toBe(true);
    }
  });
});

describe("requireMember", () => {
  async function roomWith(userId: string, role: "admin" | "member") {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db
      .insertInto("room")
      .values({
        id,
        title: null,
        ink_a: "#ff48b0",
        ink_b: "#0078bf",
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .execute();
    await db
      .insertInto("room_member")
      .values({ room_id: id, user_id: userId, role, joined_at: now })
      .execute();
    return id;
  }

  it("returns the member's role", async () => {
    const user = await createUser();
    const roomId = await roomWith(user.id, "member");
    await expect(requireMember(roomId, user.id)).resolves.toBe("member");
  });

  it("hides rooms from non-members with a 404", async () => {
    const [owner, outsider] = [await createUser(), await createUser()];
    const roomId = await roomWith(owner.id, "admin");
    await expect(requireMember(roomId, outsider.id)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects members who lack the permission with a 403", async () => {
    const user = await createUser();
    const roomId = await roomWith(user.id, "member");
    await expect(requireMember(roomId, user.id, "member.kick")).rejects.toMatchObject({
      status: 403,
    });
  });
});
