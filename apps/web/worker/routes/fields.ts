import { parseFieldDefinitionInput } from "@memoir/core";
import { contacts, fieldDefinitions } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../lib/db";
import {
  contactCountsByField,
  findOwnedFieldDefinition,
  listFieldDefinitions,
  toFieldDefinition,
  type FieldDefinitionRow,
} from "../lib/fields";
import { getSessionUser } from "../lib/session";

async function findDuplicate(
  env: Env,
  userId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await createDb(env)
    .select({ id: fieldDefinitions.id })
    .from(fieldDefinitions)
    .where(
      and(eq(fieldDefinitions.userId, userId), sql`lower(${fieldDefinitions.name}) = lower(${name})`),
    )
    .limit(2);

  return rows.some((row) => row.id !== excludeId);
}

export const fieldsRoutes = new Hono<{ Bindings: Env }>();

fieldsRoutes.get("/fields", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = await listFieldDefinitions(c.env, user.id);
  const counts = await contactCountsByField(c.env, user.id);

  return c.json({
    fields: rows.map((row) => ({
      ...toFieldDefinition(row),
      contactCount: counts.get(row.id) ?? 0,
    })),
  });
});

fieldsRoutes.post("/fields", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = parseFieldDefinitionInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  if (await findDuplicate(c.env, user.id, parsed.field.name)) {
    return c.json({ error: "You already have a field called that." }, 409);
  }

  const now = new Date();
  const row: FieldDefinitionRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: parsed.field.name,
    type: parsed.field.type,
    options: parsed.field.options,
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(fieldDefinitions).values(row);

  return c.json({ field: { ...toFieldDefinition(row), contactCount: 0 } }, 201);
});

fieldsRoutes.put("/fields/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedFieldDefinition(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That field isn't here." }, 404);
  }

  const parsed = parseFieldDefinitionInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  if (parsed.field.type !== existing.type) {
    return c.json({ error: "That field type can't change." }, 400);
  }

  if (await findDuplicate(c.env, user.id, parsed.field.name, id)) {
    return c.json({ error: "You already have a field called that." }, 409);
  }

  await createDb(c.env)
    .update(fieldDefinitions)
    .set({ name: parsed.field.name, options: parsed.field.options, updatedAt: new Date() })
    .where(and(eq(fieldDefinitions.id, id), eq(fieldDefinitions.userId, user.id)));

  const counts = await contactCountsByField(c.env, user.id);

  return c.json({
    field: {
      id,
      name: parsed.field.name,
      type: existing.type,
      options: parsed.field.options,
      contactCount: counts.get(id) ?? 0,
    },
  });
});

fieldsRoutes.delete("/fields/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedFieldDefinition(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That field isn't here." }, 404);
  }

  const path = `$."${id}"`;
  const db = createDb(c.env);

  await db
    .update(contacts)
    .set({ customFields: sql`json_remove(${contacts.customFields}, ${path})` })
    .where(
      and(eq(contacts.userId, user.id), sql`json_type(${contacts.customFields}, ${path}) is not null`),
    );

  await db
    .delete(fieldDefinitions)
    .where(and(eq(fieldDefinitions.id, id), eq(fieldDefinitions.userId, user.id)));

  return c.body(null, 204);
});
