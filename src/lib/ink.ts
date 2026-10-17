/**
 * A risograph ink pair, as the hex values stored on each room: `a` is the light ink that
 * fills bands and badges under black text, `b` the dark ink for rules and type.
 */
export type Ink = { a: string; b: string };

/** The pairs a room can be printed in. Rooms store the hex values, not a place in this list. */
export const INKS = [
  { label: "Fluorescent pink + blue", a: "#ff48b0", b: "#0078bf" },
  { label: "Sunflower + teal", a: "#ffb511", b: "#00838a" },
  { label: "Green + federal blue", a: "#00a95c", b: "#3d5588" },
  { label: "Yellow + burgundy", a: "#ffe800", b: "#914e72" },
  { label: "Orange + medium blue", a: "#ff6c2f", b: "#3255a4" },
  { label: "Bright red + teal", a: "#ff665e", b: "#00838a" },
] as const;

export function sameInk(x: Ink, y: Ink) {
  return x.a === y.a && x.b === y.b;
}

/**
 * The ink for someone's new room: the pair their other rooms use least, earliest in the
 * palette on a tie, so nobody sees two rooms in one ink until they've used every pair.
 */
export function freshInk(used: readonly Ink[]): Ink {
  const count = (ink: Ink) => used.filter((u) => sameInk(u, ink)).length;
  const { a, b } = INKS.reduce((best, ink) => (count(ink) < count(best) ? ink : best));
  return { a, b };
}

/** Attributes that print an element (and everything inside it) in one ink pair. */
export function inkVars({ a, b }: Ink) {
  return { "data-ink": "", style: `--ink-a:${a};--ink-b:${b}` };
}
