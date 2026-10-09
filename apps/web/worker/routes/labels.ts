import { parseLabelInput } from "@memoir/core";
import { contactLabels, labels } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../lib/db";
import { findOwnedLabel, type LabelRow } from "../lib/labels";
import { getSessionUser } from "../lib/session";

async function contactCountFor(env: Env, labelId: string): Promise<number> {
  const rows = await createDb(env)
    .select({ count: sql<number>`count(*)` })
    .from(contactLabels)
    .where(eq(contactLabels.labelId, labelId));

  return rows[0]?.count ?? 0;
}

async function findDuplicate(
  env: Env,
  userId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await createDb(env)
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.userId, userId), sql`lower(${labels.name}) = lower(${name})`))
    .limit(2);

  return rows.some((row) => row.id !== excludeId);
}

export const labelsRoutes = new Hono<{ Bindings: Env }>();

labelsRoutes.get("/labels", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = await createDb(c.env)
    .select({
      id: labels.id,
      name: labels.name,
      contactCount: sql<number>`count(${contactLabels.contactId})`,
    })
    .from(labels)
    .leftJoin(contactLabels, eq(contactLabels.labelId, labels.id))
    .where(eq(labels.userId, user.id))
    .groupBy(labels.id, labels.name)
    .orderBy(sql`lower(${labels.name})`);

  return c.json({ labels: rows });
});

labelsRoutes.post("/labels", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = parseLabelInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  if (await findDuplicate(c.env, user.id, parsed.name)) {
    return c.json({ error: "You already have a label called that." }, 409);
  }

  const now = new Date();
  const row: LabelRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: parsed.name,
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(labels).values(row);

  return c.json({ label: { id: row.id, name: row.name, contactCount: 0 } }, 201);
});

labelsRoutes.put("/labels/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedLabel(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That label isn't here." }, 404);
  }

  const parsed = parseLabelInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  if (await findDuplicate(c.env, user.id, parsed.name, id)) {
    return c.json({ error: "You already have a label called that." }, 409);
  }

  await createDb(c.env)
    .update(labels)
    .set({ name: parsed.name, updatedAt: new Date() })
    .where(and(eq(labels.id, id), eq(labels.userId, user.id)));

  return c.json({
    label: { id, name: parsed.name, contactCount: await contactCountFor(c.env, id) },
  });
});

labelsRoutes.delete("/labels/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedLabel(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That label isn't here." }, 404);
  }

  await createDb(c.env)
    .delete(labels)
    .where(and(eq(labels.id, id), eq(labels.userId, user.id)));

  return c.body(null, 204);
});
