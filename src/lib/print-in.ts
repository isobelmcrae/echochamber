import { prefersReducedMotion } from "svelte/motion";

/**
 * A link arriving live prints in once: it fades up while its preview's second ink slides
 * from off register (`--reg`, read by `.riso-plate`) onto its resting place.
 */
export function printIn(_node: Element) {
  return {
    duration: prefersReducedMotion.current ? 0 : 520,
    css: (t: number, u: number) => {
      const eased = 1 - Math.pow(2, -10 * t);
      return `opacity:${Math.min(1, t * 2)};--reg:${((1 - eased) * 6).toFixed(2)}px;transform:translateY(${(u * 6).toFixed(2)}px)`;
    },
  };
}
