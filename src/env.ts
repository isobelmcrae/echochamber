import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  BETTER_AUTH_SECRET: {
    description: "Secret used by Better Auth to sign sessions and tokens (32+ chars)",
  },
  BETTER_AUTH_URL: {
    description: "Public base URL of the app, e.g. http://localhost:5173",
  },
  DATABASE_PATH: {
    description: "Path to the SQLite database file",
    schema: (value) => value || "local.db",
  },
});
