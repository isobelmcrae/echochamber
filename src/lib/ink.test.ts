import { describe, expect, it } from "vitest";
import { INKS, assignInks, inkVars } from "./ink.ts";

const room = (id: string, joined_at: number) => ({ id, joined_at });

describe("assignInks", () => {
  it("gives up to one room per pair a pair of its own", () => {
    const rooms = INKS.map((_, i) => room(`r${i}`, i));
    expect(new Set(assignInks(rooms).values()).size).toBe(INKS.length);
  });

  it("keeps a room's ink when the list is reordered", () => {
    const rooms = [room("a", 3), room("b", 1), room("c", 2)];
    expect(assignInks(rooms)).toEqual(assignInks([...rooms].reverse()));
  });

  it("keeps existing rooms' inks when a newer room is joined", () => {
    const rooms = [room("a", 1), room("b", 2)];
    const before = assignInks(rooms);
    const after = assignInks([...rooms, room("c", 3)]);
    expect(after.get("a")).toBe(before.get("a"));
    expect(after.get("b")).toBe(before.get("b"));
  });

  it("cycles back through the pairs past the last one", () => {
    const rooms = Array.from({ length: INKS.length + 1 }, (_, i) => room(`r${i}`, i));
    expect(assignInks(rooms).get(`r${INKS.length}`)).toBe(assignInks(rooms).get("r0"));
  });
});

describe("inkVars", () => {
  it("prints an element in the given pair", () => {
    const { a, b } = INKS[2];
    expect(inkVars(2)).toEqual({ "data-ink": "", style: `--ink-a:${a};--ink-b:${b}` });
  });
});
