import { describe, expect, it } from "vitest";
import { buildCommentTree } from "./comment-tree.ts";

const c = (id: string, parent_id: string | null, created_at: number) => ({
  id,
  parent_id,
  created_at,
});
const shape = (nodes: ReturnType<typeof buildCommentTree<ReturnType<typeof c>>>): unknown =>
  nodes.map((n) => (n.replies.length ? [n.id, shape(n.replies)] : n.id));

describe("buildCommentTree", () => {
  it("nests replies under parents, oldest first at every level", () => {
    const flat = [
      c("b", null, 2),
      c("a", null, 1),
      c("a2", "a", 4),
      c("a1", "a", 3),
      c("a1x", "a1", 5),
    ];
    expect(shape(buildCommentTree(flat))).toEqual([["a", [["a1", ["a1x"]], "a2"]], "b"]);
  });

  it("keeps replies whose parent is missing at the top level", () => {
    expect(shape(buildCommentTree([c("orphan", "gone", 1)]))).toEqual(["orphan"]);
  });
});
