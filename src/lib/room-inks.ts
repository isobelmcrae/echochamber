import { createContext } from "svelte";

/** The ink pair (an index into `INKS`) each of the viewer's rooms is printed in. */
export const [getRoomInks, setRoomInks] = createContext<{ of: (roomId: string) => number }>();
