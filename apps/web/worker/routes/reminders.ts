import { parseReminderInput } from "@memoir/core";
import { reminders } from "@memoir/db";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { findOwnedContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import {
  findOwnedReminder,
  openReminders,
  reminderEngine,
  toReminder,
  type ReminderRow,
} from "../lib/reminders";
import { getSessionUser } from "../lib/session";

export const remindersRoutes = new Hono<{ Bindings: Env }>();

remindersRoutes.get("/reminders", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ reminders: await openReminders(c.env, user.id) });
});

remindersRoutes.get("/contacts/:contactId/reminders", async (c) => {
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
    .from(reminders)
    .where(and(eq(reminders.userId, user.id), eq(reminders.contactId, contact.id)))
    .orderBy(asc(reminders.dueOn), asc(reminders.createdAt));

  return c.json({ reminders: rows.map(toReminder) });
});

remindersRoutes.post("/contacts/:contactId/reminders", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const parsed = parseReminderInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const now = new Date();
  const row: ReminderRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    contactId: contact.id,
    body: parsed.reminder.body,
    dueOn: parsed.reminder.dueOn,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(reminders).values(row);
  await reminderEngine(c.env, user.id).reschedule();

  return c.json({ reminder: toReminder(row) }, 201);
});

remindersRoutes.post("/contacts/:contactId/reminders/:reminderId/tick", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contactId = c.req.param("contactId");
  const reminderId = c.req.param("reminderId");
  const existing = await findOwnedReminder(c.env, user.id, contactId, reminderId);

  if (existing === null) {
    return c.json({ error: "That reminder isn't here." }, 404);
  }

  const updatedAt = new Date();

  await createDb(c.env)
    .update(reminders)
    .set({ status: "done", updatedAt })
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.contactId, contactId),
        eq(reminders.userId, user.id),
      ),
    );
  await reminderEngine(c.env, user.id).reschedule();

  return c.json({ reminder: toReminder({ ...existing, status: "done", updatedAt }) });
});

remindersRoutes.delete("/contacts/:contactId/reminders/:reminderId", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contactId = c.req.param("contactId");
  const reminderId = c.req.param("reminderId");
  const existing = await findOwnedReminder(c.env, user.id, contactId, reminderId);

  if (existing === null) {
    return c.json({ error: "That reminder isn't here." }, 404);
  }

  await createDb(c.env)
    .delete(reminders)
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.contactId, contactId),
        eq(reminders.userId, user.id),
      ),
    );
  await reminderEngine(c.env, user.id).reschedule();

  return c.body(null, 204);
});
