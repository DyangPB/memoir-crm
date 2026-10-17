import { isIsoDay, parseInteractionInput, pickOnThisDay, type OnThisDay } from "@memoir/core";
import { contacts, interactions } from "@memoir/db";
import { and, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";

import { findOwnedContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import {
  attachmentsByInteraction,
  findOwnedInteraction,
  toInteraction,
  type InteractionRow,
} from "../lib/interactions";
import { attachmentKeysForInteraction, deleteObjects } from "../lib/media";
import { getSessionUser } from "../lib/session";

export const interactionsRoutes = new Hono<{ Bindings: Env }>();

// The client sends its own local day: the server has no idea what day it is for the user.
interactionsRoutes.get("/interactions/on-this-day", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const today = c.req.query("date") ?? "";

  if (!isIsoDay(today)) {
    return c.json({ error: "Send today's date as ?date=YYYY-MM-DD." }, 400);
  }

  const rows = await createDb(c.env)
    .select({ interaction: interactions, contactName: contacts.name })
    .from(interactions)
    .innerJoin(contacts, eq(contacts.id, interactions.contactId))
    .where(and(eq(interactions.userId, user.id), like(interactions.occurredOn, `%${today.slice(4)}`)))
    .orderBy(desc(interactions.createdAt));

  const picked = pickOnThisDay(
    rows.map((row) => ({ ...toInteraction(row.interaction), contactName: row.contactName })),
    today,
  );

  return c.json({ onThisDay: picked satisfies OnThisDay | null });
});

interactionsRoutes.get("/contacts/:contactId/interactions", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const rows = await createDb(c.env)
    .select()
    .from(interactions)
    .where(and(eq(interactions.userId, user.id), eq(interactions.contactId, contact.id)))
    .orderBy(desc(interactions.occurredOn), desc(interactions.createdAt));

  const attachments = await attachmentsByInteraction(c.env, user.id, { contactId: contact.id });

  return c.json({
    interactions: rows.map((row) => toInteraction(row, attachments.get(row.id) ?? [])),
  });
});

interactionsRoutes.post("/contacts/:contactId/interactions", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const parsed = parseInteractionInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const now = new Date();
  const row: InteractionRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    contactId: contact.id,
    type: parsed.interaction.type,
    occurredOn: parsed.interaction.occurredOn,
    note: parsed.interaction.note,
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(interactions).values(row);

  return c.json({ interaction: toInteraction(row) }, 201);
});

interactionsRoutes.put("/contacts/:contactId/interactions/:interactionId", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contactId = c.req.param("contactId");
  const interactionId = c.req.param("interactionId");
  const existing = await findOwnedInteraction(c.env, user.id, contactId, interactionId);

  if (existing === null) {
    return c.json({ error: "That interaction isn't here." }, 404);
  }

  const parsed = parseInteractionInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const updatedAt = new Date();

  await createDb(c.env)
    .update(interactions)
    .set({ ...parsed.interaction, updatedAt })
    .where(
      and(
        eq(interactions.id, interactionId),
        eq(interactions.contactId, contactId),
        eq(interactions.userId, user.id),
      ),
    );

  const attachments = await attachmentsByInteraction(c.env, user.id, { interactionId });

  return c.json({
    interaction: toInteraction(
      { ...existing, ...parsed.interaction, updatedAt },
      attachments.get(interactionId) ?? [],
    ),
  });
});

interactionsRoutes.delete("/contacts/:contactId/interactions/:interactionId", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contactId = c.req.param("contactId");
  const interactionId = c.req.param("interactionId");
  const existing = await findOwnedInteraction(c.env, user.id, contactId, interactionId);

  if (existing === null) {
    return c.json({ error: "That interaction isn't here." }, 404);
  }

  const fileKeys = await attachmentKeysForInteraction(c.env, user.id, interactionId);

  await createDb(c.env)
    .delete(interactions)
    .where(
      and(
        eq(interactions.id, interactionId),
        eq(interactions.contactId, contactId),
        eq(interactions.userId, user.id),
      ),
    );

  await deleteObjects(c.env, fileKeys);

  return c.body(null, 204);
});
