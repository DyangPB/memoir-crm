import type { ImportantDate, ImportantDateWithContact } from "@memoir/core";
import { contacts, importantDates } from "@memoir/db";
import { and, asc, eq, sql } from "drizzle-orm";

import { createDb } from "./db";

export type ImportantDateRow = typeof importantDates.$inferSelect;

const BIRTHDAY_NAME = "Birthday";

export function toImportantDate(row: ImportantDateRow): ImportantDate {
  return {
    id: row.id,
    contactId: row.contactId,
    name: row.name,
    fallsOn: row.fallsOn,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findOwnedImportantDate(
  env: Env,
  userId: string,
  contactId: string,
  importantDateId: string,
): Promise<ImportantDateRow | null> {
  const rows = await createDb(env)
    .select()
    .from(importantDates)
    .where(
      and(
        eq(importantDates.id, importantDateId),
        eq(importantDates.contactId, contactId),
        eq(importantDates.userId, userId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function importantDatesForContact(
  env: Env,
  userId: string,
  contactId: string,
): Promise<ImportantDate[]> {
  const rows = await createDb(env)
    .select()
    .from(importantDates)
    .where(and(eq(importantDates.userId, userId), eq(importantDates.contactId, contactId)))
    .orderBy(asc(importantDates.fallsOn), asc(importantDates.createdAt));

  return rows.map(toImportantDate);
}

export async function allImportantDates(
  env: Env,
  userId: string,
): Promise<ImportantDateWithContact[]> {
  const rows = await createDb(env)
    .select({ importantDate: importantDates, contactName: contacts.name })
    .from(importantDates)
    .innerJoin(contacts, eq(contacts.id, importantDates.contactId))
    .where(eq(importantDates.userId, userId))
    .orderBy(sql`lower(${contacts.name})`, asc(importantDates.fallsOn));

  return rows.map((row) => ({
    ...toImportantDate(row.importantDate),
    contactName: row.contactName,
  }));
}

/**
 * A Contact's birthday is an Important Date like any other, so it is kept in step
 * with the `birthday` column instead of being entered twice.
 */
export async function syncBirthdayImportantDate(
  env: Env,
  userId: string,
  contactId: string,
  birthday: string | null,
): Promise<void> {
  const db = createDb(env);
  const rows = await db
    .select()
    .from(importantDates)
    .where(
      and(
        eq(importantDates.userId, userId),
        eq(importantDates.contactId, contactId),
        eq(importantDates.source, "birthday"),
      ),
    )
    .limit(1);

  const existing = rows[0] ?? null;

  if (birthday === null) {
    if (existing !== null) {
      await db.delete(importantDates).where(eq(importantDates.id, existing.id));
    }

    return;
  }

  const now = new Date();

  if (existing === null) {
    await db.insert(importantDates).values({
      id: crypto.randomUUID(),
      userId,
      contactId,
      name: BIRTHDAY_NAME,
      fallsOn: birthday,
      source: "birthday",
      createdAt: now,
      updatedAt: now,
    });

    return;
  }

  if (existing.fallsOn !== birthday) {
    await db
      .update(importantDates)
      .set({ fallsOn: birthday, updatedAt: now })
      .where(eq(importantDates.id, existing.id));
  }
}
