import type { GoogleStatus } from "@memoir/core";
import { googleConnections, googleEventLinks } from "@memoir/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../lib/db";
import {
  findCalendarAccount,
  getGoogleClient,
  MEMOIR_CALENDAR_NAME,
  type GoogleCalendarClient,
  type GoogleCalendarSummary,
} from "../lib/google";
import { getConnection, syncGoogle } from "../lib/google/sync";
import { getSessionUser } from "../lib/session";

export const googleRoutes = new Hono<{ Bindings: Env }>();

async function statusFor(env: Env, userId: string): Promise<GoogleStatus> {
  const [account, connection] = await Promise.all([
    findCalendarAccount(env, userId),
    getConnection(env, userId),
  ]);
  const base = {
    configured: env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined,
    linked: account !== null,
    connected: connection !== null,
  };

  if (connection === null) {
    return { ...base, calendars: [], lastSyncedAt: null, lastError: null };
  }

  const client = await getGoogleClient(env, userId).catch(() => null);
  const calendars = await (client?.listCalendars() ?? Promise.resolve([])).catch(() => []);

  return {
    ...base,
    calendars: calendars
      .filter((calendar) => calendar.id !== connection.memoirCalendarId)
      .map((calendar) => ({
        ...calendar,
        selected: connection.selectedCalendarIds.includes(calendar.id),
      })),
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    lastError: connection.lastError,
  };
}

/**
 * Connecting again after a disconnect reuses the Memoir calendar left behind rather than
 * adding a second one, clearing out only the events Memoir itself made so they aren't doubled.
 */
async function findOrCreateMemoirCalendar(
  client: GoogleCalendarClient,
  calendars: GoogleCalendarSummary[],
): Promise<string> {
  const existing = calendars.find((calendar) => calendar.name === MEMOIR_CALENDAR_NAME && !calendar.primary);

  if (existing === undefined) {
    return client.createCalendar(MEMOIR_CALENDAR_NAME);
  }

  const listing = await client.listChanges(existing.id, null);

  for (const event of listing.events) {
    if (event.ours === true && !event.cancelled) {
      await client.deleteEvent(existing.id, event.id);
    }
  }

  return existing.id;
}

async function clientFor(env: Env, userId: string): Promise<GoogleCalendarClient | null> {
  return getGoogleClient(env, userId).catch(() => null);
}

googleRoutes.get("/google/status", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json(await statusFor(c.env, user.id));
});

googleRoutes.post("/google/connection", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if ((await getConnection(c.env, user.id)) !== null) {
    return c.json(await statusFor(c.env, user.id));
  }

  const account = await findCalendarAccount(c.env, user.id);
  const client = account === null ? null : await clientFor(c.env, user.id);

  if (account === null || client === null) {
    return c.json({ error: "Let Memoir see your Google Calendar first." }, 400);
  }

  if (account.refreshToken === null) {
    return c.json(
      { error: "Google didn't give Memoir lasting access. Connect again and approve everything it asks for." },
      400,
    );
  }

  // Claim the row first: of two connects arriving together, only one goes on to make a calendar.
  const db = createDb(c.env);
  const claimed = await db
    .insert(googleConnections)
    .values({ userId: user.id, memoirCalendarId: "" })
    .onConflictDoNothing()
    .returning({ userId: googleConnections.userId });

  if (claimed.length === 0) {
    return c.json(await statusFor(c.env, user.id));
  }

  try {
    const calendars = await client.listCalendars();
    const memoirCalendarId = await findOrCreateMemoirCalendar(client, calendars);

    await db
      .update(googleConnections)
      .set({
        memoirCalendarId,
        selectedCalendarIds: [calendars.find((calendar) => calendar.primary)?.id].filter(
          (id): id is string => id !== undefined,
        ),
      })
      .where(eq(googleConnections.userId, user.id));
  } catch {
    await db.delete(googleConnections).where(eq(googleConnections.userId, user.id));

    return c.json({ error: "Google Calendar couldn't be reached. Try again in a moment." }, 502);
  }

  await syncGoogle(c.env, user.id);

  return c.json(await statusFor(c.env, user.id));
});

googleRoutes.put("/google/calendars", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const connection = await getConnection(c.env, user.id);

  if (connection === null) {
    return c.json({ error: "Connect Google Calendar first." }, 409);
  }

  const body = (await c.req.json().catch(() => null)) as { calendarIds?: unknown } | null;
  const ids = body?.calendarIds;

  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return c.json({ error: "Send the calendars as a list of ids." }, 400);
  }

  const client = await clientFor(c.env, user.id);
  const known = new Set(
    (await (client?.listCalendars() ?? Promise.resolve([])).catch(() => []))
      .filter((calendar) => calendar.id !== connection.memoirCalendarId)
      .map((calendar) => calendar.id),
  );

  if (!ids.every((id) => known.has(id))) {
    return c.json({ error: "One of those isn't one of your Google calendars." }, 400);
  }

  await createDb(c.env)
    .update(googleConnections)
    .set({ selectedCalendarIds: [...new Set(ids as string[])] })
    .where(eq(googleConnections.userId, user.id));

  return c.json(await statusFor(c.env, user.id));
});

googleRoutes.delete("/google/connection", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);

  await db.delete(googleEventLinks).where(eq(googleEventLinks.userId, user.id));
  await db.delete(googleConnections).where(eq(googleConnections.userId, user.id));

  return c.body(null, 204);
});

googleRoutes.post("/google/sync", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if ((await getConnection(c.env, user.id)) === null) {
    return c.json({ error: "Connect Google Calendar first." }, 409);
  }

  const result = await syncGoogle(c.env, user.id);

  return result.ok
    ? c.json(await statusFor(c.env, user.id))
    : c.json({ error: result.message }, 502);
});
