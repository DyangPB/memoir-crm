import type { Reminder, ReminderWithContact } from "@memoir/core";
import { contacts, reminders } from "@memoir/db";
import { and, asc, eq, ne } from "drizzle-orm";

import { createDb } from "./db";

export type ReminderRow = typeof reminders.$inferSelect;

export function toReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    contactId: row.contactId,
    body: row.body,
    dueOn: row.dueOn,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findOwnedReminder(
  env: Env,
  userId: string,
  contactId: string,
  reminderId: string,
): Promise<ReminderRow | null> {
  const rows = await createDb(env)
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.contactId, contactId),
        eq(reminders.userId, userId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function openReminders(env: Env, userId: string): Promise<ReminderWithContact[]> {
  const rows = await createDb(env)
    .select({ reminder: reminders, contactName: contacts.name })
    .from(reminders)
    .innerJoin(contacts, eq(contacts.id, reminders.contactId))
    .where(and(eq(reminders.userId, userId), ne(reminders.status, "done")))
    .orderBy(asc(reminders.dueOn), asc(reminders.createdAt));

  return rows.map((row) => ({ ...toReminder(row.reminder), contactName: row.contactName }));
}

export function reminderEngine(env: Env, userId: string) {
  return env.REMINDERS.get(env.REMINDERS.idFromName(userId));
}
