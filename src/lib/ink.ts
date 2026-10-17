/**
 * Risograph ink pairs. Every room is printed in one pair: `a` is the light
 * ink that fills bands and badges under black text, `b` the dark ink for rules and type.
 */
export const INKS = [
  { a: "#ff48b0", b: "#0078bf" }, // fluorescent pink + blue
  { a: "#ffb511", b: "#00838a" }, // sunflower + teal
  { a: "#00a95c", b: "#3d5588" }, // green + federal blue
  { a: "#ffe800", b: "#914e72" }, // yellow + burgundy
  { a: "#ff6c2f", b: "#3255a4" }, // orange + medium blue
  { a: "#ff665e", b: "#00838a" }, // bright red + teal
] as const;

/**
 * Each of the viewer's rooms gets its own ink pair, handed out in the order they joined, so
 * nobody sees two rooms in one ink until they're in more rooms than there are pairs, and
 * joining a new room never repaints the old ones.
 */
export function assignInks(rooms: readonly { id: string; joined_at: number }[]) {
  const byJoin = [...rooms].sort((x, y) => x.joined_at - y.joined_at || x.id.localeCompare(y.id));
  return new Map(byJoin.map((room, i) => [room.id, i % INKS.length]));
}

/** Attributes that print an element (and everything inside it) in one ink pair. */
export function inkVars(ink: number) {
  const { a, b } = INKS[ink % INKS.length]!;
  return { "data-ink": "", style: `--ink-a:${a};--ink-b:${b}` };
}
