import { describe, expect, it } from "vitest";
import { roomName, roomPerson } from "./room-name.ts";

const me = { id: "me", name: "Me" };
const people = ["Ana", "Ben", "Cy", "Di"].map((name) => ({ id: name, name }));

describe("roomName", () => {
  it("prefers the title", () => {
    expect(roomName({ title: "Reels", members: [me, ...people] }, "me")).toBe("Reels");
  });

  it("names a 1:1 after the other person", () => {
    expect(roomName({ title: null, members: [me, people[0]] }, "me")).toBe("Ana");
  });

  it("summarizes big untitled groups", () => {
    expect(roomName({ title: null, members: [me, ...people] }, "me")).toBe("Ana, Ben and 2 others");
  });

  it("handles an empty room", () => {
    expect(roomName({ title: null, members: [me] }, "me")).toBe("Just you");
  });
});

describe("roomPerson", () => {
  it("is the other member of an untitled 1:1", () => {
    expect(roomPerson({ title: null, members: [me, people[0]] }, "me")).toBe(people[0]);
  });

  it("is nobody in a titled room or a group", () => {
    expect(roomPerson({ title: "Reels", members: [me, people[0]] }, "me")).toBeNull();
    expect(roomPerson({ title: null, members: [me, ...people] }, "me")).toBeNull();
  });
});
