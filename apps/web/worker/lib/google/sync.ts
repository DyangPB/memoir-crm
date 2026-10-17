import {
  parseImportantDateInput,
  parseReminderInput,
  planSync,
  toGoogleEvent,
  type MirrorItem,
  type SyncAction,
  type SyncLink,
} from "@memoir/core";
import {
  contacts,
  googleConnections,
  googleEventLinks,
  importantDates,
  reminders,
} from "@memoir/db";
import { and, eq, isNull, lt, ne, or } from "drizzle-orm";

import { createDb } from "../db";
import { reminderEngine } from "../reminders";
import { GoogleApiError, GoogleAuthError, type GoogleCalendarClient } from "./client";
import { getGoogleClient } from "./index";

export type ConnectionRow = typeof googleConnections.$inferSelect;

/** A sync that dies mid-run frees its lock after this long. */
const LOCK_MS = 60_000;
const MAX_RERUNS = 3;

export async function getConnection(env: Env, userId: string): Promise<ConnectionRow | null> {
  const rows = await createDb(env)
    .select()
    .from(googleConnections)
    // A row with no calendar yet is a connect still in progress.
    .where(and(eq(googleConnections.userId, userId), ne(googleConnections.memoirCalendarId, "")))
    .limit(1);

  return rows[0] ?? null;
}

async function loadMirrorItems(env: Env, userId: string): Promise<MirrorItem[]> {
  const db = createDb(env);
  const reminderRows = await db
    .select({ reminder: reminders, contactName: contacts.name })
    .from(reminders)
    .innerJoin(contacts, eq(contacts.id, reminders.contactId))
    .where(eq(reminders.userId, userId));
  const dateRows = await db
    .select({ importantDate: importantDates, contactName: contacts.name })
    .from(importantDates)
    .innerJoin(contacts, eq(contacts.id, importantDates.contactId))
    .where(eq(importantDates.userId, userId));

  return [
    ...reminderRows.map(
      (row): MirrorItem => ({
        kind: "reminder",
        id: row.reminder.id,
        title: row.reminder.body,
        date: row.reminder.dueOn,
        contactName: row.contactName,
        updatedAt: row.reminder.updatedAt.getTime(),
        done: row.reminder.status === "done",
        mirror: "full",
      }),
    ),
    ...dateRows.map(
      (row): MirrorItem => ({
        kind: "important-date",
        id: row.importantDate.id,
        title: row.importantDate.name,
        date: row.importantDate.fallsOn,
        contactName: row.contactName,
        updatedAt: row.importantDate.updatedAt.getTime(),
        done: false,
        mirror: row.importantDate.source === "birthday" ? "push-only" : "full",
      }),
    ),
  ];
}

async function loadLinks(env: Env, userId: string): Promise<SyncLink[]> {
  const rows = await createDb(env)
    .select()
    .from(googleEventLinks)
    .where(eq(googleEventLinks.userId, userId));

  return rows.map((row) => ({
    kind: row.kind,
    itemId: row.itemId,
    eventId: row.eventId,
    title: row.title,
    date: row.date,
    remoteUpdated: row.remoteUpdated,
  }));
}

async function saveLink(env: Env, userId: string, link: SyncLink): Promise<void> {
  await createDb(env)
    .insert(googleEventLinks)
    .values({ id: crypto.randomUUID(), userId, ...link })
    .onConflictDoUpdate({
      target: [googleEventLinks.userId, googleEventLinks.kind, googleEventLinks.itemId],
      set: {
        eventId: link.eventId,
        title: link.title,
        date: link.date,
        remoteUpdated: link.remoteUpdated,
      },
    });
}

async function dropLink(env: Env, userId: string, eventId: string): Promise<void> {
  await createDb(env)
    .delete(googleEventLinks)
    .where(and(eq(googleEventLinks.userId, userId), eq(googleEventLinks.eventId, eventId)));
}

async function applyUpdateLocal(
  env: Env,
  userId: string,
  action: Extract<SyncAction, { type: "update-local" }>,
): Promise<boolean> {
  const db = createDb(env);
  const updatedAt = new Date();

  if (action.kind === "reminder") {
    const parsed = parseReminderInput({ body: action.title, dueOn: action.date });

    if (!parsed.ok) {
      return false;
    }

    await db
      .update(reminders)
      .set({ body: parsed.reminder.body, dueOn: parsed.reminder.dueOn, status: "pending", updatedAt })
      .where(and(eq(reminders.id, action.id), eq(reminders.userId, userId)));
    await reminderEngine(env, userId).reschedule();

    return true;
  }

  const parsed = parseImportantDateInput({ name: action.title, fallsOn: action.date });

  if (!parsed.ok) {
    return false;
  }

  await db
    .update(importantDates)
    .set({ name: parsed.importantDate.name, fallsOn: parsed.importantDate.fallsOn, updatedAt })
    .where(and(eq(importantDates.id, action.id), eq(importantDates.userId, userId)));

  return true;
}

/** Errors that mean the whole run should stop, not just one item. */
function stopsTheRun(error: unknown): boolean {
  return (
    !(error instanceof GoogleApiError) ||
    error.status === 401 ||
    error.status === 403 ||
    error.status === 429 ||
    error.status >= 500
  );
}

/** Carries out the plan, returning how many items Google refused so the rest still go through. */
async function runActions(
  env: Env,
  userId: string,
  client: GoogleCalendarClient,
  calendarId: string,
  actions: readonly SyncAction[],
): Promise<number> {
  let refused = 0;

  for (const action of actions) {
    try {
      await runAction(env, userId, client, calendarId, action);
    } catch (error) {
      if (stopsTheRun(error)) {
        throw error;
      }

      refused += 1;
    }
  }

  return refused;
}

async function runAction(
  env: Env,
  userId: string,
  client: GoogleCalendarClient,
  calendarId: string,
  action: SyncAction,
): Promise<void> {
  const db = createDb(env);

  switch (action.type) {
    case "create-event": {
      const created = await client.insertEvent(calendarId, toGoogleEvent(action.item));

      await saveLink(env, userId, {
        kind: action.item.kind,
        itemId: action.item.id,
        eventId: created.id,
        title: action.item.title,
        date: action.item.date,
        remoteUpdated: created.updated,
      });
      break;
    }
    case "update-event": {
      try {
        const updated = await client.updateEvent(calendarId, action.eventId, toGoogleEvent(action.item));

        await saveLink(env, userId, {
          kind: action.item.kind,
          itemId: action.item.id,
          eventId: action.eventId,
          title: action.item.title,
          date: action.item.date,
          remoteUpdated: updated.updated,
        });
      } catch (error) {
        // The event vanished between listing and updating; the next run recreates it.
        if (!(error instanceof GoogleApiError) || (error.status !== 404 && error.status !== 410)) {
          throw error;
        }

        await dropLink(env, userId, action.eventId);
      }
      break;
    }
    case "delete-event":
      await client.deleteEvent(calendarId, action.eventId);
      await dropLink(env, userId, action.eventId);
      break;
    case "update-local": {
      const applied = await applyUpdateLocal(env, userId, action);

      if (applied) {
        await db
          .update(googleEventLinks)
          .set({ title: action.title, date: action.date, remoteUpdated: action.remoteUpdated })
          .where(
            and(eq(googleEventLinks.userId, userId), eq(googleEventLinks.eventId, action.eventId)),
          );
      } else {
        await db
          .update(googleEventLinks)
          .set({ remoteUpdated: action.remoteUpdated })
          .where(
            and(eq(googleEventLinks.userId, userId), eq(googleEventLinks.eventId, action.eventId)),
          );
      }
      break;
    }
    case "delete-local":
      if (action.kind === "reminder") {
        await db
          .delete(reminders)
          .where(and(eq(reminders.id, action.id), eq(reminders.userId, userId)));
        await reminderEngine(env, userId).reschedule();
      } else {
        await db
          .delete(importantDates)
          .where(and(eq(importantDates.id, action.id), eq(importantDates.userId, userId)));
      }

      await dropLink(env, userId, action.eventId);
      break;
    case "refresh-link":
      await db
        .update(googleEventLinks)
        .set({ remoteUpdated: action.remoteUpdated })
        .where(
          and(eq(googleEventLinks.userId, userId), eq(googleEventLinks.eventId, action.eventId)),
        );
      break;
    case "drop-link":
      await dropLink(env, userId, action.eventId);
      break;
  }
}

async function runOnce(env: Env, userId: string, connection: ConnectionRow): Promise<void> {
  const client = await getGoogleClient(env, userId);

  if (client === null) {
    throw new GoogleAuthError("Connect Google Calendar again.");
  }

  const [local, links] = await Promise.all([loadMirrorItems(env, userId), loadLinks(env, userId)]);
  // The token is taken before our own writes, so they come back next run as echoes.
  const listing = await client.listChanges(connection.memoirCalendarId, connection.syncToken);
  const actions = planSync({
    local,
    links,
    remote: listing.events,
    fullListing: listing.full,
  });

  const refused = await runActions(env, userId, client, connection.memoirCalendarId, actions);

  await createDb(env)
    .update(googleConnections)
    .set({
      // Hold the token back while anything was refused, so those changes are seen again.
      syncToken: refused === 0 ? listing.nextSyncToken : connection.syncToken,
      lastSyncedAt: new Date(),
      lastError: refused === 0 ? null : "Some items couldn't be synced. Memoir will try them again.",
    })
    .where(eq(googleConnections.userId, userId));
}

function messageFor(error: unknown): string {
  if (error instanceof GoogleAuthError) {
    return error.message;
  }

  if (error instanceof GoogleApiError) {
    if (error.status === 404) {
      return "The Memoir calendar is gone from Google. Disconnect and connect again.";
    }

    return error.status === 401 || error.status === 403
      ? "Google turned down the connection. Connect Google Calendar again."
      : "Google Calendar couldn't be reached. Try again in a moment.";
  }

  return "The sync didn't finish. Try again in a moment.";
}

export type SyncResult = { ok: true } | { ok: false; message: string };

/**
 * Brings a user's Memoir calendar in Google and their Reminders and Important Dates
 * level. One run at a time per user: a second request while one is running asks it
 * to go round again, so nothing is pushed twice.
 */
export async function syncGoogle(env: Env, userId: string): Promise<SyncResult> {
  const db = createDb(env);
  const connection = await getConnection(env, userId);

  if (connection === null) {
    return { ok: true };
  }

  const now = Date.now();
  const lease = new Date(now + LOCK_MS);
  const acquired = await db
    .update(googleConnections)
    .set({ syncLockedUntil: lease })
    .where(
      and(
        eq(googleConnections.userId, userId),
        or(isNull(googleConnections.syncLockedUntil), lt(googleConnections.syncLockedUntil, new Date(now))),
      ),
    )
    .returning({ userId: googleConnections.userId });

  if (acquired.length === 0) {
    await db
      .update(googleConnections)
      .set({ resyncRequested: true })
      .where(eq(googleConnections.userId, userId));

    return { ok: true };
  }

  try {
    for (let run = 0; run < MAX_RERUNS; run += 1) {
      const current = await getConnection(env, userId);

      if (current === null) {
        break;
      }

      await db
        .update(googleConnections)
        .set({ resyncRequested: false })
        .where(eq(googleConnections.userId, userId));
      await runOnce(env, userId, current);

      if (!(await getConnection(env, userId))?.resyncRequested) {
        break;
      }
    }

    return { ok: true };
  } catch (error) {
    const message = messageFor(error);

    await db
      .update(googleConnections)
      .set({ lastError: message })
      .where(eq(googleConnections.userId, userId));

    return { ok: false, message };
  } finally {
    // Only our own lease: one that expired may already belong to the next run.
    await db
      .update(googleConnections)
      .set({ syncLockedUntil: null })
      .where(
        and(eq(googleConnections.userId, userId), eq(googleConnections.syncLockedUntil, lease)),
      );
  }
}
