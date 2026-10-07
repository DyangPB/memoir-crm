import { Hono } from "hono";

export const health = new Hono<{ Bindings: Env }>();

health.get("/health", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok")
    .first<{ ok: number }>()
    .catch(() => null);

  if (row?.ok !== 1) {
    return c.json({ status: "error", database: "unavailable" }, 503);
  }

  return c.json({ status: "ok", database: "ok" });
});
