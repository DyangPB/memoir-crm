import { buildSearchQuery, parseContactInput, parseCustomFieldValues } from "@memoir/core";
import { contactLabels, contacts, labels } from "@memoir/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";

import {
  contactIdsMatching,
  contactIdsWithLabel,
  findOwnedContact,
  labelsByContact,
  labelsForContact,
  lastInteractionDates,
  latestInteractionOn,
  toContact,
  type ContactRow,
} from "../lib/contacts";
import { createDb } from "../lib/db";
import { listFieldDefinitions } from "../lib/fields";
import { findOwnedLabel } from "../lib/labels";
import { getSessionUser } from "../lib/session";

export const contactsRoutes = new Hono<{ Bindings: Env }>();

async function parseContactBody(env: Env, userId: string, body: unknown) {
  const parsed = parseContactInput(body);

  if (!parsed.ok) {
    return { ok: false as const, message: parsed.message };
  }

  const definitions = await listFieldDefinitions(env, userId);
  const customFields = parseCustomFieldValues(
    definitions,
    (body as Record<string, unknown>).customFields,
  );

  if (!customFields.ok) {
    return { ok: false as const, message: customFields.message };
  }

  return { ok: true as const, contact: parsed.contact, customFields: customFields.values };
}

contactsRoutes.get("/contacts", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const match = buildSearchQuery(c.req.query("q") ?? "");
  const labelId = c.req.query("label");
  let idFilter: Set<string> | null = null;

  if (match !== null) {
    idFilter = await contactIdsMatching(c.env, match);
  }

  if (labelId !== undefined) {
    const label = await findOwnedLabel(c.env, user.id, labelId);
    const labelIds = label === null ? new Set<string>() : await contactIdsWithLabel(c.env, labelId);

    idFilter =
      idFilter === null
        ? labelIds
        : new Set([...idFilter].filter((contactId) => labelIds.has(contactId)));
  }

  if (idFilter !== null && idFilter.size === 0) {
    return c.json({ contacts: [] });
  }

  const rows = await createDb(c.env)
    .select()
    .from(contacts)
    .where(
      idFilter === null
        ? eq(contacts.userId, user.id)
        : and(eq(contacts.userId, user.id), inArray(contacts.id, [...idFilter])),
    )
    .orderBy(sql`lower(${contacts.name})`);

  const lastByContact = await lastInteractionDates(c.env, user.id);
  const labelsMap = await labelsByContact(c.env, user.id);

  return c.json({
    contacts: rows.map((row) =>
      toContact(row, lastByContact.get(row.id) ?? null, labelsMap.get(row.id) ?? []),
    ),
  });
});

contactsRoutes.post("/contacts", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = await parseContactBody(c.env, user.id, await c.req.json().catch(() => null));

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
    customFields: parsed.customFields,
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(contacts).values(row);

  return c.json({ contact: toContact(row, null, []) }, 201);
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
  const contactLabelsList = await labelsForContact(c.env, user.id, row.id);

  return c.json({ contact: toContact(row, lastInteractionAt, contactLabelsList) });
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

  const parsed = await parseContactBody(c.env, user.id, await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const updatedAt = new Date();

  await createDb(c.env)
    .update(contacts)
    .set({ ...parsed.contact, customFields: parsed.customFields, updatedAt })
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.id)));

  const lastInteractionAt = await latestInteractionOn(c.env, user.id, id);
  const contactLabelsList = await labelsForContact(c.env, user.id, id);

  return c.json({
    contact: toContact(
      { ...existing, ...parsed.contact, customFields: parsed.customFields, updatedAt },
      lastInteractionAt,
      contactLabelsList,
    ),
  });
});

contactsRoutes.put("/contacts/:id/labels", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const contact = await findOwnedContact(c.env, user.id, id);

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const body = (await c.req.json().catch(() => null)) as { labelIds?: unknown } | null;
  const rawIds = body?.labelIds;

  if (!Array.isArray(rawIds) || !rawIds.every((value) => typeof value === "string")) {
    return c.json({ error: "Send the labels as a list of ids." }, 400);
  }

  const labelIds = [...new Set(rawIds as string[])];
  const db = createDb(c.env);

  if (labelIds.length > 0) {
    const owned = await db
      .select({ id: labels.id })
      .from(labels)
      .where(and(eq(labels.userId, user.id), inArray(labels.id, labelIds)));

    if (owned.length !== labelIds.length) {
      return c.json({ error: "One of those labels isn't yours." }, 400);
    }
  }

  await db.delete(contactLabels).where(eq(contactLabels.contactId, contact.id));

  if (labelIds.length > 0) {
    await db
      .insert(contactLabels)
      .values(labelIds.map((labelId) => ({ contactId: contact.id, labelId })));
  }

  const contactLabelsList = await labelsForContact(c.env, user.id, contact.id);
  const lastInteractionAt = await latestInteractionOn(c.env, user.id, contact.id);

  return c.json({ contact: toContact(contact, lastInteractionAt, contactLabelsList) });
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
