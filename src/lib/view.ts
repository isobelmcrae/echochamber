import { createContext } from "svelte";

/** How the queue and room feeds lay out their links: ruled rows, or a gallery of previews. */
export type View = "list" | "gallery";

/** Kept in a cookie rather than storage, so the server renders the chosen view first time. */
export const VIEW_COOKIE = "view";

export const parseView = (value: string | undefined): View =>
  value === "gallery" ? "gallery" : "list";

export const [getView, setView] = createContext<{ current: View; set: (view: View) => void }>();
