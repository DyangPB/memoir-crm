import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("reports the API and database as healthy", async () => {
    const response = await exports.default.fetch("https://memoir.test/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", database: "ok" });
  });
});

describe("D1 migrations", () => {
  it("applies the schema to a real D1 binding", async () => {
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'",
    ).first<{ name: string }>();

    expect(row?.name).toBe("app_meta");
  });
});
