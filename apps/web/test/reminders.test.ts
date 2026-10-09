import type { Contact, Reminder, ReminderWithContact } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";
const MS_PER_DAY = 86_400_000;

async function api(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method,
    headers: {
      origin: ORIGIN,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(cookie !== undefined ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function sessionCookie(response: Response): string {
  const fromGetSetCookie = response.headers.getSetCookie?.().join(", ") ?? "";
  const header = fromGetSetCookie !== "" ? fromGetSetCookie : (response.headers.get("set-cookie") ?? "");
  const match = /((?:__Secure-)?better-auth\.session_token=[^;]+)/.exec(header);

  if (match?.[1] === undefined) {
    throw new Error(`No session cookie in response: ${header}`);
  }

  return match[1];
}

async function signInAs(email: string): Promise<string> {
  const response = await api("POST", "/api/auth/sign-up/email", {
    name: email,
    email,
    password: PASSWORD,
  });

  return sessionCookie(response);
}

async function createContact(cookie: string, name: string): Promise<Contact> {
  const response = await api("POST", "/api/contacts", { name }, cookie);

  expect(response.status).toBe(201);
  const body = (await response.json()) as { contact: Contact };

  return body.contact;
}

async function createReminder(
  cookie: string,
  contactId: string,
  body: string,
  dueOn: string,
): Promise<Reminder> {
  const response = await api("POST", `/api/contacts/${contactId}/reminders`, { body, dueOn }, cookie);

  expect(response.status).toBe(201);
  const payload = (await response.json()) as { reminder: Reminder };

  return payload.reminder;
}

async function listContactReminders(cookie: string, contactId: string): Promise<Reminder[]> {
  const response = await api("GET", `/api/contacts/${contactId}/reminders`, undefined, cookie);

  expect(response.status).toBe(200);
  const body = (await response.json()) as { reminders: Reminder[] };

  return body.reminders;
}

function dayOffset(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

async function reminderEngine(email: string) {
  const row = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();

  if (row === null) {
    throw new Error(`No user for ${email}`);
  }

  return env.REMINDERS.get(env.REMINDERS.idFromName(row.id));
}

describe("reminders", () => {
  it("creates a reminder on a contact with a due date", async () => {
    const cookie = await signInAs("reminders-create@example.com");
    const contact = await createContact(cookie, "Bob Nguyen");

    const response = await api(
      "POST",
      `/api/contacts/${contact.id}/reminders`,
      { body: "  Call Bob  ", dueOn: "2026-10-20" },
      cookie,
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as { reminder: Reminder };
    expect(payload.reminder).toEqual({
      id: expect.any(String),
      contactId: contact.id,
      body: "Call Bob",
      dueOn: "2026-10-20",
      status: "pending",
      createdAt: expect.any(String),
    });

    const row = await env.DB.prepare(
      "SELECT body, due_on, status FROM reminders WHERE id = ?",
    )
      .bind(payload.reminder.id)
      .first<{ body: string; due_on: string; status: string }>();
    expect(row).toEqual({ body: "Call Bob", due_on: "2026-10-20", status: "pending" });
  });

  it("rejects a blank reminder or an impossible date", async () => {
    const cookie = await signInAs("reminders-validation@example.com");
    const contact = await createContact(cookie, "Marco Silva");
    const path = `/api/contacts/${contact.id}/reminders`;

    const blank = await api("POST", path, { body: "   ", dueOn: "2026-10-20" }, cookie);
    expect(blank.status).toBe(400);

    const impossible = await api("POST", path, { body: "Call Marco", dueOn: "2026-02-31" }, cookie);
    expect(impossible.status).toBe(400);
  });

  it("lists a contact's reminders, soonest first", async () => {
    const cookie = await signInAs("reminders-order@example.com");
    const contact = await createContact(cookie, "Ines Okafor");

    await createReminder(cookie, contact.id, "Second", "2026-11-05");
    await createReminder(cookie, contact.id, "First", "2026-10-20");
    await createReminder(cookie, contact.id, "Third", "2026-12-01");

    const listed = await listContactReminders(cookie, contact.id);
    expect(listed.map((reminder) => reminder.body)).toEqual(["First", "Second", "Third"]);
  });

  it("ticks a reminder off", async () => {
    const cookie = await signInAs("reminders-tick@example.com");
    const contact = await createContact(cookie, "Kofi Mensah");
    const reminder = await createReminder(cookie, contact.id, "Call Kofi", "2026-10-20");
    const path = `/api/contacts/${contact.id}/reminders/${reminder.id}`;

    const tick = await api("POST", `${path}/tick`, undefined, cookie);
    expect(tick.status).toBe(200);
    const payload = (await tick.json()) as { reminder: Reminder };
    expect(payload.reminder).toMatchObject({ id: reminder.id, status: "done" });

    const listed = await listContactReminders(cookie, contact.id);
    expect(listed.find((item) => item.id === reminder.id)?.status).toBe("done");
  });

  it("removes a reminder, and removes them all with the contact", async () => {
    const cookie = await signInAs("reminders-delete@example.com");
    const contact = await createContact(cookie, "Lena Fischer");
    const reminder = await createReminder(cookie, contact.id, "Send a card", "2026-10-25");
    const path = `/api/contacts/${contact.id}/reminders/${reminder.id}`;

    const remove = await api("DELETE", path, undefined, cookie);
    expect(remove.status).toBe(204);
    expect((await api("DELETE", path, undefined, cookie)).status).toBe(404);

    const cascadeContact = await createContact(cookie, "Ada Lovelace");
    await createReminder(cookie, cascadeContact.id, "Write", "2026-10-30");
    await api("DELETE", `/api/contacts/${cascadeContact.id}`, undefined, cookie);

    const rows = await env.DB.prepare("SELECT COUNT(*) AS count FROM reminders WHERE contact_id = ?")
      .bind(cascadeContact.id)
      .first<{ count: number }>();
    expect(rows?.count).toBe(0);
  });

  it("hides another user's reminders from every verb", async () => {
    const owner = await signInAs("reminders-owner@example.com");
    const stranger = await signInAs("reminders-stranger@example.com");
    const contact = await createContact(owner, "Dana Reyes");
    const reminder = await createReminder(owner, contact.id, "Call Dana", "2026-10-20");
    const path = `/api/contacts/${contact.id}/reminders`;

    expect((await api("GET", path, undefined, stranger)).status).toBe(404);
    expect(
      (await api("POST", path, { body: "Intrusion", dueOn: "2026-10-21" }, stranger)).status,
    ).toBe(404);
    expect((await api("POST", `${path}/${reminder.id}/tick`, undefined, stranger)).status).toBe(404);
    expect((await api("DELETE", `${path}/${reminder.id}`, undefined, stranger)).status).toBe(404);

    const stillThere = await api("GET", path, undefined, owner);
    const body = (await stillThere.json()) as { reminders: Reminder[] };
    expect(body.reminders).toHaveLength(1);
  });
});

describe("reminder engine", () => {
  it("marks a reminder due when its day arrives, and overdue the day after", async () => {
    const email = "reminder-engine-days@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Bob Nguyen");
    const dueToday = await createReminder(cookie, contact.id, "Call Bob", dayOffset(0));
    const overdue = await createReminder(cookie, contact.id, "Send a card", dayOffset(-3));

    const engine = await reminderEngine(email);
    const ran = await runDurableObjectAlarm(engine);
    expect(ran).toBe(true);

    const listed = await listContactReminders(cookie, contact.id);
    expect(listed.find((item) => item.id === dueToday.id)?.status).toBe("due");
    expect(listed.find((item) => item.id === overdue.id)?.status).toBe("overdue");
  });

  it("leaves a reminder that isn't due yet pending", async () => {
    const email = "reminder-engine-future@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Sofia Marchetti");
    const future = await createReminder(cookie, contact.id, "Plan the trip", dayOffset(30));

    const engine = await reminderEngine(email);
    const ran = await runDurableObjectAlarm(engine);
    expect(ran).toBe(true);

    const listed = await listContactReminders(cookie, contact.id);
    expect(listed.find((item) => item.id === future.id)?.status).toBe("pending");
  });

  it("keeps a ticked-off reminder done when the alarm fires", async () => {
    const email = "reminder-engine-done@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Dana Reyes");
    const reminder = await createReminder(cookie, contact.id, "Call Dana", dayOffset(-2));

    await api("POST", `/api/contacts/${contact.id}/reminders/${reminder.id}/tick`, undefined, cookie);

    const engine = await reminderEngine(email);
    await runDurableObjectAlarm(engine);

    const listed = await listContactReminders(cookie, contact.id);
    expect(listed.find((item) => item.id === reminder.id)?.status).toBe("done");
  });

  it("aims its single alarm at the next due event, and clears it when nothing is open", async () => {
    const email = "reminder-engine-alarm@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Lena Fischer");
    const reminder = await createReminder(cookie, contact.id, "Call Lena", dayOffset(1));

    const engine = await reminderEngine(email);
    const armed = await runInDurableObject(engine, (_instance, state) => state.storage.getAlarm());
    expect(armed).toBe(Date.parse(`${dayOffset(1)}T00:00:00.000Z`));

    await api("POST", `/api/contacts/${contact.id}/reminders/${reminder.id}/tick`, undefined, cookie);

    const cleared = await runInDurableObject(engine, (_instance, state) => state.storage.getAlarm());
    expect(cleared).toBeNull();
  });
});

describe("home reminders", () => {
  it("lists open reminders across contacts, soonest first, with their contact", async () => {
    const email = "reminders-home@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const ada = await createContact(cookie, "Ada Lovelace");
    const due = await createReminder(cookie, bob.id, "Call Bob", dayOffset(0));
    const overdue = await createReminder(cookie, ada.id, "Send a card", dayOffset(-3));
    const future = await createReminder(cookie, ada.id, "Plan the trip", dayOffset(30));
    const done = await createReminder(cookie, bob.id, "Write", dayOffset(-5));
    await api("POST", `/api/contacts/${bob.id}/reminders/${done.id}/tick`, undefined, cookie);

    const engine = await reminderEngine(email);
    await runDurableObjectAlarm(engine);

    const response = await api("GET", "/api/reminders", undefined, cookie);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { reminders: ReminderWithContact[] };

    expect(body.reminders.map((reminder) => reminder.body)).toEqual([
      "Send a card",
      "Call Bob",
      "Plan the trip",
    ]);
    expect(body.reminders.find((item) => item.id === overdue.id)).toMatchObject({
      contactName: "Ada Lovelace",
      status: "overdue",
    });
    expect(body.reminders.find((item) => item.id === due.id)).toMatchObject({
      contactName: "Bob Nguyen",
      status: "due",
    });
    expect(body.reminders.find((item) => item.id === future.id)?.status).toBe("pending");
    expect(body.reminders.map((item) => item.id)).not.toContain(done.id);
  });

  it("keeps one user's reminders out of another's strip", async () => {
    const owner = await signInAs("reminders-strip-owner@example.com");
    const stranger = await signInAs("reminders-strip-stranger@example.com");
    const contact = await createContact(owner, "Zebra Keeper");
    await createReminder(owner, contact.id, "Call Zebra", dayOffset(-1));

    const response = await api("GET", "/api/reminders", undefined, stranger);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { reminders: ReminderWithContact[] };
    expect(body.reminders).toEqual([]);
  });
});
