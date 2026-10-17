import { describe, expect, it, vi } from "vitest";
import { resetWhenEmptied } from "./reset-when-emptied.ts";

// Just enough of an <input> inside a <form>: Node has EventTarget but no DOM.
function field(value: string) {
  const input = Object.assign(new EventTarget(), { value, form: { reset: vi.fn<() => void>() } });
  const type = (next: string) => {
    input.value = next;
    input.dispatchEvent(new Event("input"));
  };
  return { input, type };
}

describe("resetWhenEmptied", () => {
  it("resets the form, clearing its errors, when the field is emptied", () => {
    const { input, type } = field("not a link");
    resetWhenEmptied(input as unknown as HTMLInputElement);
    type("");
    expect(input.form.reset).toHaveBeenCalledOnce();
  });

  it("leaves the form alone while the field still has text", () => {
    const { input, type } = field("https://exa");
    resetWhenEmptied(input as unknown as HTMLInputElement);
    type("https://ex");
    expect(input.form.reset).not.toHaveBeenCalled();
  });

  it("stops listening once detached", () => {
    const { input, type } = field("not a link");
    resetWhenEmptied(input as unknown as HTMLInputElement)();
    type("");
    expect(input.form.reset).not.toHaveBeenCalled();
  });
});
