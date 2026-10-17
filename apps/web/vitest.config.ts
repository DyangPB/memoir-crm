import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const migrationsPath = path.join(import.meta.dirname, "../../packages/db/migrations");

export default defineConfig({
  test: {
    projects: [
      {
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
          name: "api",
          include: ["test/**/*.test.ts"],
          setupFiles: ["./test/apply-migrations.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test-setup.ts"],
        },
      },
    ],
  },
});
