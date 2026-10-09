import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const migrationsPath = path.join(import.meta.dirname, "../../packages/db/migrations");

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET: "K8sJ2mQ4vX1pR7wZ9tY3nB6cD0fG5hL8jM2sV4x",
          TEST_MIGRATIONS: await readD1Migrations(migrationsPath),
        },
      },
    })),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
