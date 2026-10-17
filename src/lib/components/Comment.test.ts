import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import Comment from "./Comment.svelte";

describe("Comment", () => {
  // A browser closes a <p> at the first <div> inside it, so the hydrated DOM no longer matches.
  it("never nests a block inside a paragraph", () => {
    const node = {
      id: "c1",
      body: "Hello",
      deleted: false,
      created_at: Date.now(),
      edited_at: null,
      author: {
        id: "u1",
        name: "Ada Lovelace",
        username: "ada",
        image: "https://example.com/a.png",
      },
      replies: [],
    };
    // oxlint-disable-next-line typescript/no-explicit-any -- a minimal node, not a full thread row
    const { body } = render(Comment, {
      props: { node: node as any, linkId: "l1", meId: "u1", role: "member" },
    });
    expect(body).not.toMatch(/<p\b(?:(?!<\/p>).)*<div/s);
  });
});
