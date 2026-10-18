import { Hono } from "hono";

import { createMcpKey, listMcpKeys, revokeMcpKey } from "../lib/mcp-keys";
import { getSessionUser } from "../lib/session";

const NAME_MAX_LENGTH = 80;

export const mcpKeysRoutes = new Hono<{ Bindings: Env }>();

mcpKeysRoutes.get("/mcp-keys", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ keys: await listMcpKeys(c.env, user.id) });
});

mcpKeysRoutes.post("/mcp-keys", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (name === "" || name.length > NAME_MAX_LENGTH) {
    return c.json(
      { error: `Name this key so you can recognise it later, in ${NAME_MAX_LENGTH} characters or fewer.` },
      400,
    );
  }

  return c.json(await createMcpKey(c.env, user.id, name), 201);
});

mcpKeysRoutes.delete("/mcp-keys/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!(await revokeMcpKey(c.env, user.id, c.req.param("id")))) {
    return c.json({ error: "That key isn't here." }, 404);
  }

  return c.body(null, 204);
});
