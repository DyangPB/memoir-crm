import type { Contact } from "@memoir/core";
import { contacts, interactions } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";

import { createDb } from "./db";

export type ContactRow = typeof contacts.$inferSelect;

export function toContact(row: ContactRow, lastInteractionAt: string | null): Contact {
  return {
    id: row.id,
    name: row.name,
    emails: row.emails,
    phones: row.phones,
    socialLinks: row.socialLinks,
    birthday: row.birthday,
    howWeMet: row.howWeMet,
    lastInteractionAt,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findOwnedContact(
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

export async function lastInteractionDates(env: Env, userId: string): Promise<Map<string, string>> {
  const rows = await createDb(env)
    .select({
      contactId: interactions.contactId,
      last: sql<string | null>`max(${interactions.occurredOn})`,
    })
    .from(interactions)
    .where(eq(interactions.userId, userId))
    .groupBy(interactions.contactId);

  const entries: [string, string][] = [];

  for (const row of rows) {
    if (row.last !== null) {
      entries.push([row.contactId, row.last]);
    }
  }

  return new Map(entries);
}

export async function latestInteractionOn(
  env: Env,
  userId: string,
  contactId: string,
): Promise<string | null> {
  const rows = await createDb(env)
    .select({ last: sql<string | null>`max(${interactions.occurredOn})` })
    .from(interactions)
    .where(and(eq(interactions.userId, userId), eq(interactions.contactId, contactId)));

  return rows[0]?.last ?? null;
}
