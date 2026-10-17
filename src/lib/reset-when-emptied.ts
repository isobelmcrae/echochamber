/**
 * Attachment for a remote form's input: clearing the field resets its form. A remote form only
 * drops a server issue (like "That doesn't look like a web link") on the next submit or a
 * reset, so without this the error outlives the text it was about.
 */
export function resetWhenEmptied(input: HTMLInputElement) {
  const onInput = () => {
    if (input.value === "") input.form?.reset();
  };
  input.addEventListener("input", onInput);
  return () => input.removeEventListener("input", onInput);
}
