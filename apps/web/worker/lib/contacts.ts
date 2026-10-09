import type { Contact, Label } from "@memoir/core";
import { contactLabels, contacts, interactions, labels } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";

import { createDb } from "./db";

export type ContactRow = typeof contacts.$inferSelect;

export function toContact(
  row: ContactRow,
  lastInteractionAt: string | null,
  contactLabelsList: Label[],
): Contact {
  return {
    id: row.id,
    name: row.name,
    emails: row.emails,
    phones: row.phones,
    socialLinks: row.socialLinks,
    birthday: row.birthday,
    howWeMet: row.howWeMet,
    labels: contactLabelsList,
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

export async function labelsByContact(env: Env, userId: string): Promise<Map<string, Label[]>> {
  const rows = await createDb(env)
    .select({ contactId: contactLabels.contactId, id: labels.id, name: labels.name })
    .from(contactLabels)
    .innerJoin(labels, eq(labels.id, contactLabels.labelId))
    .where(eq(labels.userId, userId))
    .orderBy(sql`lower(${labels.name})`);

  const map = new Map<string, Label[]>();

  for (const row of rows) {
    const label = { id: row.id, name: row.name };
    const existing = map.get(row.contactId);

    if (existing === undefined) {
      map.set(row.contactId, [label]);
    } else {
      existing.push(label);
    }
  }

  return map;
}

export async function labelsForContact(
  env: Env,
  userId: string,
  contactId: string,
): Promise<Label[]> {
  const rows = await createDb(env)
    .select({ id: labels.id, name: labels.name })
    .from(contactLabels)
    .innerJoin(labels, eq(labels.id, contactLabels.labelId))
    .where(and(eq(contactLabels.contactId, contactId), eq(labels.userId, userId)))
    .orderBy(sql`lower(${labels.name})`);

  return rows;
}

export async function contactIdsWithLabel(env: Env, labelId: string): Promise<Set<string>> {
  const rows = await createDb(env)
    .select({ contactId: contactLabels.contactId })
    .from(contactLabels)
    .where(eq(contactLabels.labelId, labelId));

  return new Set(rows.map((row) => row.contactId));
}

export async function contactIdsMatching(env: Env, match: string): Promise<Set<string>> {
  const result = await env.DB.prepare(
    "SELECT contact_id FROM contacts_fts WHERE contacts_fts MATCH ?",
  )
    .bind(match)
    .all<{ contact_id: string }>();

  return new Set((result.results ?? []).map((row) => row.contact_id));
}
