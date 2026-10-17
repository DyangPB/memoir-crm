import { cadenceHealth, contactsToCatchUp, isIsoDay } from "@memoir/core";
import { contacts } from "@memoir/db";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";

import { labelsByContact, lastInteractionDates, toContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import { getSessionUser } from "../lib/session";
import { defaultCadenceDays } from "../lib/settings";

export const cadenceRoutes = new Hono<{ Bindings: Env }>();

// The client sends its own local day: the server has no idea what day it is for the user.
cadenceRoutes.get("/cadence", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const today = c.req.query("date") ?? "";

  if (!isIsoDay(today)) {
    return c.json({ error: "Send today's date as ?date=YYYY-MM-DD." }, 400);
  }

  const now = new Date(`${today}T00:00:00.000Z`);
  const defaultDays = await defaultCadenceDays(c.env, user.id);
  const rows = await createDb(c.env)
    .select()
    .from(contacts)
    .where(eq(contacts.userId, user.id))
    .orderBy(sql`lower(${contacts.name})`);
  const lastByContact = await lastInteractionDates(c.env, user.id);
  const labelsMap = await labelsByContact(c.env, user.id);
  const everyone = rows.map((row) =>
    toContact(row, lastByContact.get(row.id) ?? null, labelsMap.get(row.id) ?? [], defaultDays),
  );

  return c.json({
    defaultCadenceDays: defaultDays,
    health: cadenceHealth(everyone, now, defaultDays),
    catchUp: contactsToCatchUp(everyone, now, defaultDays),
  });
});
