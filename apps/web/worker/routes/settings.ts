import { parseCadenceDays } from "@memoir/core";
import { Hono } from "hono";

import { defaultCadenceDays, saveDefaultCadenceDays } from "../lib/settings";
import { getSessionUser } from "../lib/session";

export const settingsRoutes = new Hono<{ Bindings: Env }>();

settingsRoutes.get("/settings", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ settings: { defaultCadenceDays: await defaultCadenceDays(c.env, user.id) } });
});

settingsRoutes.put("/settings", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as { defaultCadenceDays?: unknown } | null;
  const parsed = parseCadenceDays(body?.defaultCadenceDays);

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  await saveDefaultCadenceDays(c.env, user.id, parsed.days);

  return c.json({ settings: { defaultCadenceDays: parsed.days } });
});
