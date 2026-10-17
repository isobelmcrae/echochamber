import { createContext } from "svelte";
import type { Ink } from "#lib/ink.ts";

/** The ink pair each of the viewer's rooms is printed in. */
export const [getRoomInks, setRoomInks] = createContext<{ of: (roomId: string) => Ink }>();
