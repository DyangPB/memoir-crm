import {
  isIsoDay,
  parseInteractionInput,
  pickOnThisDay,
  type Interaction,
  type OnThisDay,
} from "@memoir/core";
import { contacts, interactions } from "@memoir/db";
import { and, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";

import { findOwnedContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import { getSessionUser } from "../lib/session";

type InteractionRow = typeof interactions.$inferSelect;

function toInteraction(row: InteractionRow): Interaction {
  return {
    id: row.id,
    contactId: row.contactId,
    type: row.type,
    occurredOn: row.occurredOn,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findOwnedInteraction(
  env: Env,
  userId: string,
  contactId: string,
  interactionId: string,
): Promise<InteractionRow | null> {
  const rows = await createDb(env)
    .select()
    .from(interactions)
    .where(
      and(
        eq(interactions.id, interactionId),
        eq(interactions.contactId, contactId),
        eq(interactions.userId, userId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

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

  return c.json({ interactions: rows.map(toInteraction) });
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

  return c.json({ interaction: toInteraction({ ...existing, ...parsed.interaction, updatedAt }) });
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

  await createDb(c.env)
    .delete(interactions)
    .where(
      and(
        eq(interactions.id, interactionId),
        eq(interactions.contactId, contactId),
        eq(interactions.userId, user.id),
      ),
    );

  return c.body(null, 204);
});
