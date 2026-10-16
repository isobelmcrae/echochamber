type Flat = { id: string; parent_id: string | null; created_at: number };
export type CommentNode<T extends Flat> = T & { replies: CommentNode<T>[] };

/** Nest flat comments into threads, chronological at every level. */
export function buildCommentTree<T extends Flat>(comments: T[]): CommentNode<T>[] {
  const sorted = comments.toSorted(
    (a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id),
  );
  const nodes = new Map(sorted.map((c) => [c.id, { ...c, replies: [] as CommentNode<T>[] }]));
  const roots: CommentNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    (parent ? parent.replies : roots).push(node);
  }
  return roots;
}
