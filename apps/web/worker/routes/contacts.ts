import { parseContactInput } from "@memoir/core";
import { contacts } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";

import {
  findOwnedContact,
  lastInteractionDates,
  latestInteractionOn,
  toContact,
  type ContactRow,
} from "../lib/contacts";
import { createDb } from "../lib/db";
import { getSessionUser } from "../lib/session";

export const contactsRoutes = new Hono<{ Bindings: Env }>();

contactsRoutes.get("/contacts", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const lastByContact = await lastInteractionDates(c.env, user.id);
  const rows = await createDb(c.env)
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.id))
    .orderBy(sql`lower(${contacts.name})`);

  return c.json({ contacts: rows.map((row) => toContact(row, lastByContact.get(row.id) ?? null)) });
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

  return c.json({ contact: toContact(row, null) }, 201);
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

  const lastInteractionAt = await latestInteractionOn(c.env, user.id, row.id);

  return c.json({ contact: toContact(row, lastInteractionAt) });
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

  const lastInteractionAt = await latestInteractionOn(c.env, user.id, id);

  return c.json({
    contact: toContact({ ...existing, ...parsed.contact, updatedAt }, lastInteractionAt),
  });
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
