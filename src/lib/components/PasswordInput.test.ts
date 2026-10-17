import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import PasswordInput from "./PasswordInput.svelte";

describe("PasswordInput", () => {
  it("starts hidden with a button to show it", () => {
    const { body } = render(PasswordInput, {
      props: { id: "password", autocomplete: "current-password" },
    });
    expect(body).toContain('type="password"');
    expect(body).toContain('aria-label="Show password"');
    expect(body).toContain('aria-pressed="false"');
    expect(body).toContain('title="Show password"');
  });
});
