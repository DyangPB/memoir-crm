import { parseReminderInput, parseRescheduleInput } from "@memoir/core";
import { reminders } from "@memoir/db";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { findOwnedContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import {
  doneReminders,
  findOwnedReminder,
  openReminders,
  reminderEngine,
  toReminder,
  type ReminderRow,
} from "../lib/reminders";
import { syncSoon } from "../lib/google/queue";
import { getSessionUser } from "../lib/session";

export const remindersRoutes = new Hono<{ Bindings: Env }>();

remindersRoutes.get("/reminders", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (c.req.query("status") === "done") {
    return c.json({ reminders: await doneReminders(c.env, user.id) });
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
  syncSoon(c, user.id);

  return c.json({ reminder: toReminder(row) }, 201);
});

remindersRoutes.patch("/contacts/:contactId/reminders/:reminderId", async (c) => {
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

  const parsed = parseRescheduleInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  if (existing.status === "done") {
    return c.json({ error: "That reminder is already done." }, 409);
  }

  // Like a new Reminder, a moved one starts pending; the engine's alarm owns due/overdue.
  const updatedAt = new Date();

  await createDb(c.env)
    .update(reminders)
    .set({ dueOn: parsed.dueOn, status: "pending", updatedAt })
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.contactId, contactId),
        eq(reminders.userId, user.id),
      ),
    );
  await reminderEngine(c.env, user.id).reschedule();
  syncSoon(c, user.id);

  return c.json({ reminder: toReminder({ ...existing, dueOn: parsed.dueOn, status: "pending", updatedAt }) });
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
  syncSoon(c, user.id);

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
  syncSoon(c, user.id);

  return c.body(null, 204);
});
