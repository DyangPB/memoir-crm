import { buildDemoSeed } from "@memoir/core";
import {
  contactLabels,
  contacts,
  fieldDefinitions,
  importantDates,
  interactions,
  labels,
  notes,
  reminders,
  userSettings,
  users,
} from "@memoir/db";
import { eq } from "drizzle-orm";

import { createAuth } from "./auth";
import { createDb } from "./db";
import { reminderEngine } from "./reminders";

export const DEMO_EMAIL = "demo@memoir.example";
export const DEMO_PASSWORD = "memoir-demo-1";

const DEMO_NAME = "Memoir demo";

export type DemoSession = {
  email: string;
  contacts: number;
  cookies: string[];
};

async function findUserId(env: Env, email: string): Promise<string | null> {
  const rows = await createDb(env)
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return rows[0]?.id ?? null;
}

/**
 * Replaces the demo user's rows with a fresh seed in one D1 transaction, so a
 * visitor always lands on the same address book and never on another visitor's
 * edits. Returns how many contacts the seed holds.
 */
async function reseedDemoAccount(env: Env, userId: string, now: Date): Promise<number> {
  const seed = buildDemoSeed(now);
  const db = createDb(env);

  await db.batch([
    db.delete(contacts).where(eq(contacts.userId, userId)),
    db.delete(labels).where(eq(labels.userId, userId)),
    db.delete(fieldDefinitions).where(eq(fieldDefinitions.userId, userId)),
    db.delete(userSettings).where(eq(userSettings.userId, userId)),
    db
      .insert(fieldDefinitions)
      .values(seed.fieldDefinitions.map((field) => ({ ...field, userId }))),
    db.insert(labels).values(seed.labels.map((label) => ({ ...label, userId }))),
    db.insert(contacts).values(
      seed.contacts.map((contact) => ({
        id: contact.id,
        userId,
        name: contact.name,
        emails: contact.emails,
        phones: contact.phones,
        socialLinks: contact.socialLinks,
        birthday: contact.birthday,
        howWeMet: contact.howWeMet,
        customFields: contact.customFields,
      })),
    ),
    db.insert(interactions).values(
      seed.contacts.flatMap((contact) =>
        contact.interactions.map((entry) => ({
          id: entry.id,
          userId,
          contactId: contact.id,
          type: entry.type,
          occurredOn: entry.occurredOn,
          note: entry.note,
        })),
      ),
    ),
    db.insert(notes).values(
      seed.contacts.flatMap((contact) =>
        contact.notes.map((entry) => ({ id: entry.id, userId, contactId: contact.id, body: entry.body })),
      ),
    ),
    db.insert(reminders).values(
      seed.contacts.flatMap((contact) =>
        contact.reminders.map((entry) => ({
          id: entry.id,
          userId,
          contactId: contact.id,
          body: entry.body,
          dueOn: entry.dueOn,
          status: entry.status,
        })),
      ),
    ),
    db.insert(importantDates).values(
      seed.contacts.flatMap((contact) =>
        contact.importantDates.map((entry) => ({
          id: entry.id,
          userId,
          contactId: contact.id,
          name: entry.name,
          fallsOn: entry.fallsOn,
          source: entry.source,
        })),
      ),
    ),
    db.insert(contactLabels).values(
      seed.contacts.flatMap((contact) =>
        contact.labelIds.map((labelId) => ({ contactId: contact.id, labelId })),
      ),
    ),
  ]);

  await reminderEngine(env, userId).reschedule();

  return seed.contacts.length;
}

/**
 * Signs the visitor into the shared demo account: creates it on the first visit,
 * reseeds it either way, then starts a session and hands back its cookie.
 */
export async function openDemoAccount(env: Env, requestUrl: string): Promise<DemoSession | null> {
  const auth = createAuth(env, requestUrl);
  let userId = await findUserId(env, DEMO_EMAIL);

  if (userId === null) {
    await auth.api.signUpEmail({
      body: { name: DEMO_NAME, email: DEMO_EMAIL, password: DEMO_PASSWORD },
      asResponse: true,
    });
    userId = await findUserId(env, DEMO_EMAIL);
  }

  if (userId === null) {
    return null;
  }

  const contacts = await reseedDemoAccount(env, userId, new Date());
  const signIn = await auth.api.signInEmail({
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    asResponse: true,
  });

  if (!signIn.ok) {
    return null;
  }

  return { email: DEMO_EMAIL, contacts, cookies: signIn.headers.getSetCookie() };
}
