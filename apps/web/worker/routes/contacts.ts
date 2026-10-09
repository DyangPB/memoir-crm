import { parseContactInput, type Contact } from "@memoir/core";
import { contacts } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../lib/db";
import { getSessionUser } from "../lib/session";

type ContactRow = typeof contacts.$inferSelect;

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    emails: row.emails,
    phones: row.phones,
    socialLinks: row.socialLinks,
    birthday: row.birthday,
    howWeMet: row.howWeMet,
    lastInteractionAt: null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findOwnedContact(
  env: Env,
  userId: string,
  contactId: string,
): Promise<ContactRow | null> {
  const rows = await createDb(env)
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export const contactsRoutes = new Hono<{ Bindings: Env }>();

contactsRoutes.get("/contacts", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = await createDb(c.env)
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.id))
    .orderBy(sql`lower(${contacts.name})`);

  return c.json({ contacts: rows.map(toContact) });
});

contactsRoutes.post("/contacts", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = parseContactInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const now = new Date();
  const row: ContactRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: parsed.contact.name,
    emails: parsed.contact.emails,
    phones: parsed.contact.phones,
    socialLinks: parsed.contact.socialLinks,
    birthday: parsed.contact.birthday,
    howWeMet: parsed.contact.howWeMet,
    customFields: {},
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(contacts).values(row);

  return c.json({ contact: toContact(row) }, 201);
});

contactsRoutes.get("/contacts/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const row = await findOwnedContact(c.env, user.id, c.req.param("id"));

  if (row === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  return c.json({ contact: toContact(row) });
});

contactsRoutes.put("/contacts/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedContact(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const parsed = parseContactInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const updatedAt = new Date();

  await createDb(c.env)
    .update(contacts)
    .set({ ...parsed.contact, updatedAt })
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.id)));

  return c.json({ contact: toContact({ ...existing, ...parsed.contact, updatedAt }) });
});

contactsRoutes.delete("/contacts/:id", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedContact(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  await createDb(c.env)
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.id)));

  return c.body(null, 204);
});
