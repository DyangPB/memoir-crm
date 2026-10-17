import { buildDemoSeed, type DemoSeed } from "@memoir/core";
import {
  contactLabels,
  contacts,
  fieldDefinitions,
  importantDates,
  interactionAttachments,
  interactions,
  labels,
  notes,
  reminders,
  userSettings,
  users,
} from "@memoir/db";
import { eq } from "drizzle-orm";

import { createAuth } from "./auth";
import { inChunks } from "./chunks";
import { createDb } from "./db";
import { attachmentKey, deleteUserMedia, photoKey } from "./media";
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

/** D1 allows 100 bound variables per statement; a contact row binds 13 of them. */
const CONTACTS_PER_INSERT = 7;

async function storeDemoFiles(env: Env, userId: string, seed: DemoSeed): Promise<void> {
  const puts: Promise<unknown>[] = [];

  for (const contact of seed.contacts) {
    if (contact.photo !== null) {
      puts.push(
        env.MEDIA.put(photoKey(userId, contact.id), contact.photo.bytes, {
          httpMetadata: { contentType: contact.photo.contentType },
        }),
      );
    }

    for (const interaction of contact.interactions) {
      for (const attachment of interaction.attachments) {
        puts.push(
          env.MEDIA.put(attachmentKey(userId, attachment.id), attachment.bytes, {
            httpMetadata: { contentType: attachment.contentType },
          }),
        );
      }
    }
  }

  await Promise.all(puts);
}

/**
 * Replaces the demo user's files, then its rows in one D1 batch, with a fresh seed,
 * so a visitor always lands on the same address book and never on another visitor's
 * edits. Returns how many contacts the seed holds.
 */
async function reseedDemoAccount(env: Env, userId: string, now: Date): Promise<number> {
  const seed = buildDemoSeed(now);
  const db = createDb(env);
  const contactRows = seed.contacts.map((contact) => ({
    id: contact.id,
    userId,
    name: contact.name,
    emails: contact.emails,
    phones: contact.phones,
    socialLinks: contact.socialLinks,
    birthday: contact.birthday,
    howWeMet: contact.howWeMet,
    location: contact.location,
    roleCompany: contact.roleCompany,
    timezone: contact.timezone,
    photoKey: contact.photo === null ? null : photoKey(userId, contact.id),
    customFields: contact.customFields,
  }));

  await deleteUserMedia(env, userId);
  await storeDemoFiles(env, userId, seed);

  await db.batch([
    db.delete(contacts).where(eq(contacts.userId, userId)),
    db.delete(labels).where(eq(labels.userId, userId)),
    db.delete(fieldDefinitions).where(eq(fieldDefinitions.userId, userId)),
    db.delete(userSettings).where(eq(userSettings.userId, userId)),
    db
      .insert(fieldDefinitions)
      .values(seed.fieldDefinitions.map((field) => ({ ...field, userId }))),
    db.insert(labels).values(seed.labels.map((label) => ({ ...label, userId }))),
    ...inChunks(contactRows, CONTACTS_PER_INSERT).map((rows) => db.insert(contacts).values(rows)),
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
    db.insert(interactionAttachments).values(
      seed.contacts.flatMap((contact) =>
        contact.interactions.flatMap((interaction) =>
          interaction.attachments.map((attachment) => ({
            id: attachment.id,
            userId,
            contactId: contact.id,
            interactionId: interaction.id,
            objectKey: attachmentKey(userId, attachment.id),
            fileName: attachment.fileName,
            contentType: attachment.contentType,
            size: attachment.bytes.length,
          })),
        ),
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
