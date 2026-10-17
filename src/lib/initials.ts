/** Up to two initials for an avatar fallback: "Ada Lovelace" → "AL". */
export function initials(name: string) {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]!.toUpperCase())
    .join("");
}
