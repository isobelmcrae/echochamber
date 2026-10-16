import { toast } from "svelte-sonner";

/** Run a remote command, toasting its error message instead of throwing. Returns whether it succeeded. */
export async function attempt(run: () => Promise<unknown>, success?: string) {
  try {
    await run();
    if (success) toast.success(success);
    return true;
  } catch (e) {
    const err = e as { body?: { message?: string }; message?: string };
    toast.error(err.body?.message ?? err.message ?? "Something went wrong");
    return false;
  }
}
