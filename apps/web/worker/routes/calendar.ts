import {
  expandImportantDates,
  googleEventDays,
  parseCalendarRange,
  type CalendarItem,
} from "@memoir/core";
import { contacts, reminders } from "@memoir/db";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../lib/db";
import { getGoogleClient } from "../lib/google";
import { getConnection } from "../lib/google/sync";
import { allImportantDates } from "../lib/important-dates";
import { getSessionUser } from "../lib/session";

export const calendarRoutes = new Hono<{ Bindings: Env }>();

/** Events from the Google calendars the user chose. A Google outage leaves the layer empty, not the page. */
async function googleLayer(
  env: Env,
  userId: string,
  from: string,
  to: string,
): Promise<CalendarItem[]> {
  const connection = await getConnection(env, userId);

  if (connection === null || connection.selectedCalendarIds.length === 0) {
    return [];
  }

  const client = await getGoogleClient(env, userId).catch(() => null);

  if (client === null) {
    return [];
  }

  const calendarIds = connection.selectedCalendarIds.filter((id) => id !== connection.memoirCalendarId);
  const results = await Promise.allSettled(
    calendarIds.map(async (calendarId) =>
      (await client.listEvents(calendarId, from, to)).flatMap((event) =>
        googleEventDays(event.start, event.end, from, to).map(
          (date): CalendarItem => ({
            kind: "google",
            id: event.id,
            title: event.title,
            date,
            start: event.start,
            end: event.end,
            calendarId,
            meetUrl: event.meetUrl,
          }),
        ),
      ),
    ),
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

calendarRoutes.get("/calendar", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = parseCalendarRange(c.req.query("from"), c.req.query("to"));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const { from, to } = parsed.range;
  const rows = await createDb(c.env)
    .select({ reminder: reminders, contactName: contacts.name })
    .from(reminders)
    .innerJoin(contacts, eq(contacts.id, reminders.contactId))
    .where(and(eq(reminders.userId, user.id), gte(reminders.dueOn, from), lte(reminders.dueOn, to)))
    .orderBy(asc(reminders.dueOn), asc(reminders.createdAt));

  const reminderItems: CalendarItem[] = rows.map((row) => ({
    kind: "reminder",
    id: row.reminder.id,
    title: row.reminder.body,
    date: row.reminder.dueOn,
    contactId: row.reminder.contactId,
    contactName: row.contactName,
    done: row.reminder.status === "done",
  }));
  const dateItems = expandImportantDates(await allImportantDates(c.env, user.id), from, to);
  const googleItems = await googleLayer(c.env, user.id, from, to);
  const items = [...dateItems, ...reminderItems, ...googleItems].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  return c.json({ items });
});
