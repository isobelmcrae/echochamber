import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
        experimental: { async: true },
      },
      adapter: adapter(),
      // Vitest gets its own generated files: they inline env values, and sharing
      // .svelte-kit with a running dev server would hand it the test database.
      outDir: process.env.VITEST ? "node_modules/.cache/svelte-kit-vitest" : undefined,
      experimental: { remoteFunctions: true },
    }),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "node",
    setupFiles: ["src/test-setup.ts"],
  },
});
