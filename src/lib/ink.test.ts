import { describe, expect, it } from "vitest";
import { INKS, freshInk, inkVars } from "./ink.ts";

const pair = ({ a, b }: { a: string; b: string }) => ({ a, b });

describe("freshInk", () => {
  it("starts at the first pair", () => {
    expect(freshInk([])).toEqual(pair(INKS[0]));
  });

  it("picks a pair none of the rooms use while there is one", () => {
    expect(freshInk(INKS.slice(0, 3).map(pair))).toEqual(pair(INKS[3]));
    expect(freshInk([pair(INKS[1])])).toEqual(pair(INKS[0]));
  });

  it("picks the least used pair once every pair is taken", () => {
    const used = [...INKS, ...INKS.filter((_, i) => i !== 2)].map(pair);
    expect(freshInk(used)).toEqual(pair(INKS[2]));
  });

  it("tells pairs that share a dark ink apart", () => {
    // Sunflower and bright red are both printed with teal.
    expect(INKS[1].b).toBe(INKS[5].b);
    expect(freshInk(INKS.filter((_, i) => i !== 5).map(pair))).toEqual(pair(INKS[5]));
  });
});

describe("inkVars", () => {
  it("prints an element in the given pair", () => {
    expect(inkVars({ a: "#00a95c", b: "#3d5588" })).toEqual({
      "data-ink": "",
      style: "--ink-a:#00a95c;--ink-b:#3d5588",
    });
  });
});
