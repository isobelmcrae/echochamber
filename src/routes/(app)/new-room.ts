import { createContext } from "svelte";

/** Opens the layout's one "New room" dialog from anywhere under (app). */
export const [getNewRoom, setNewRoom] = createContext<{ open: () => void }>();
