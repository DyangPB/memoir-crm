import { parseImportantDateInput } from "@memoir/core";
import { importantDates } from "@memoir/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { findOwnedContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import {
  allImportantDates,
  findOwnedImportantDate,
  importantDatesForContact,
  toImportantDate,
  type ImportantDateRow,
} from "../lib/important-dates";
import { getSessionUser } from "../lib/session";

export const importantDatesRoutes = new Hono<{ Bindings: Env }>();

importantDatesRoutes.get("/important-dates", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ importantDates: await allImportantDates(c.env, user.id) });
});

importantDatesRoutes.get("/contacts/:contactId/important-dates", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  return c.json({
    importantDates: await importantDatesForContact(c.env, user.id, contact.id),
  });
});

importantDatesRoutes.post("/contacts/:contactId/important-dates", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const parsed = parseImportantDateInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const now = new Date();
  const row: ImportantDateRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    contactId: contact.id,
    name: parsed.importantDate.name,
    fallsOn: parsed.importantDate.fallsOn,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(importantDates).values(row);

  return c.json({ importantDate: toImportantDate(row) }, 201);
});

importantDatesRoutes.delete(
  "/contacts/:contactId/important-dates/:importantDateId",
  async (c) => {
    const user = await getSessionUser(c.env, c.req.raw);

    if (user === null) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const contactId = c.req.param("contactId");
    const importantDateId = c.req.param("importantDateId");
    const existing = await findOwnedImportantDate(c.env, user.id, contactId, importantDateId);

    if (existing === null) {
      return c.json({ error: "That important date isn't here." }, 404);
    }

    await createDb(c.env)
      .delete(importantDates)
      .where(
        and(
          eq(importantDates.id, importantDateId),
          eq(importantDates.contactId, contactId),
          eq(importantDates.userId, user.id),
        ),
      );

    return c.body(null, 204);
  },
);
