import {
  buildDemoSeed,
  occursWithinDays,
  UPCOMING_WINDOW_DAYS,
  type Contact,
  type FieldDefinitionSummary,
  type ImportantDate,
  type ImportantDateWithContact,
  type Interaction,
  type LabelSummary,
  type Note,
  type Reminder,
  type ReminderWithContact,
} from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";
const DEMO_EMAIL = "demo@memoir.example";
const DEMO_PASSWORD = "memoir-demo-1";
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

async function startDemo(): Promise<string> {
  const response = await api("POST", "/api/demo");

  expect(response.status).toBe(200);

  return sessionCookie(response);
}

async function listContacts(cookie: string): Promise<Contact[]> {
  const response = await api("GET", "/api/contacts", undefined, cookie);

  expect(response.status).toBe(200);
  const body = (await response.json()) as { contacts: Contact[] };

  return body.contacts;
}

function byName(left: string, right: string): number {
  return left.toLowerCase() < right.toLowerCase() ? -1 : 1;
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

describe("demo account", () => {
  it("signs a visitor into a populated address book in one call", async () => {
    const response = await api("POST", "/api/demo");

    expect(response.status).toBe(200);
    const body = (await response.json()) as { demo: { email: string; contacts: number } };
    const seed = buildDemoSeed(new Date());

    expect(body.demo.email).toBe(DEMO_EMAIL);
    expect(body.demo.contacts).toBe(seed.contacts.length);

    const contacts = await listContacts(sessionCookie(response));
    const expected = [...seed.contacts].sort((left, right) => byName(left.name, right.name));

    expect(contacts.map((contact) => contact.id)).toEqual(
      expected.map((contact) => contact.id),
    );
    expect(contacts.map((contact) => contact.name)).toEqual(
      expected.map((contact) => contact.name),
    );
  });

  it("covers every surface the app offers", async () => {
    const cookie = await startDemo();
    const now = new Date();

    const [contacts, labels, fields, reminders, dates] = await Promise.all([
      listContacts(cookie),
      api("GET", "/api/labels", undefined, cookie).then(
        (response) => response.json() as Promise<{ labels: LabelSummary[] }>,
      ),
      api("GET", "/api/fields", undefined, cookie).then(
        (response) => response.json() as Promise<{ fields: FieldDefinitionSummary[] }>,
      ),
      api("GET", "/api/reminders", undefined, cookie).then(
        (response) => response.json() as Promise<{ reminders: ReminderWithContact[] }>,
      ),
      api("GET", "/api/important-dates", undefined, cookie).then(
        (response) => response.json() as Promise<{ importantDates: ImportantDateWithContact[] }>,
      ),
    ]);

    expect(contacts.length).toBeGreaterThanOrEqual(8);
    expect(contacts.some((contact) => contact.labels.length === 0)).toBe(true);
    expect(contacts.some((contact) => contact.labels.length >= 3)).toBe(true);
    expect(contacts.some((contact) => contact.lastInteractionAt === null)).toBe(true);

    expect(labels.labels.length).toBeGreaterThanOrEqual(4);
    expect(labels.labels.every((label) => label.contactCount >= 2)).toBe(true);

    expect(new Set(fields.fields.map((field) => field.type)).size).toBe(8);
    expect(fields.fields.every((field) => field.contactCount >= 1)).toBe(true);

    const statuses = reminders.reminders.map((reminder) => reminder.status);

    expect(statuses).toContain("due");
    expect(statuses).toContain("overdue");
    expect(statuses).toContain("pending");
    expect(reminders.reminders.every((reminder) => reminder.contactName !== "")).toBe(true);

    const dateSources = new Set(dates.importantDates.map((date) => date.source));

    expect(dateSources).toEqual(new Set(["birthday", "manual"]));
    expect(
      dates.importantDates.some((date) =>
        occursWithinDays(date.fallsOn, now, UPCOMING_WINDOW_DAYS),
      ),
    ).toBe(true);
    expect(
      dates.importantDates.some(
        (date) => !occursWithinDays(date.fallsOn, now, UPCOMING_WINDOW_DAYS),
      ),
    ).toBe(true);
  });

  it("fills a contact's timeline, notes, fields, reminders and dates", async () => {
    const cookie = await startDemo();
    const seed = buildDemoSeed(new Date());

    const farida = await api("GET", "/api/contacts/demo-contact-farida", undefined, cookie);
    const devon = await api("GET", "/api/contacts/demo-contact-devon", undefined, cookie);

    expect(farida.status).toBe(200);
    expect(devon.status).toBe(200);

    const faridaBody = (await farida.json()) as { contact: Contact };
    const devonBody = (await devon.json()) as { contact: Contact };
    const fieldIds = seed.fieldDefinitions.map((field) => field.id);

    expect(Object.keys(faridaBody.contact.customFields).sort()).toEqual([...fieldIds].sort());
    expect(devonBody.contact.customFields).toEqual({});
    expect(devonBody.contact.lastInteractionAt).toBeNull();

    const timeline = await api("GET", "/api/contacts/demo-contact-farida/interactions", undefined, cookie);
    const notes = await api("GET", "/api/contacts/demo-contact-farida/notes", undefined, cookie);
    const reminders = await api("GET", "/api/contacts/demo-contact-farida/reminders", undefined, cookie);
    const devonTimeline = await api("GET", "/api/contacts/demo-contact-devon/interactions", undefined, cookie);

    const timelineBody = (await timeline.json()) as { interactions: Interaction[] };
    const notesBody = (await notes.json()) as { notes: Note[] };
    const remindersBody = (await reminders.json()) as { reminders: Reminder[] };
    const devonBodyTimeline = (await devonTimeline.json()) as { interactions: Interaction[] };

    expect(new Set(timelineBody.interactions.map((entry) => entry.type)).size).toBe(4);
    expect(notesBody.notes).toHaveLength(2);
    expect(remindersBody.reminders.some((reminder) => reminder.status === "done")).toBe(true);
    expect(devonBodyTimeline.interactions).toEqual([]);

    const dates = await api("GET", "/api/contacts/demo-contact-farida/important-dates", undefined, cookie);
    const datesBody = (await dates.json()) as { importantDates: ImportantDate[] };

    expect(datesBody.importantDates.filter((date) => date.source === "birthday")).toHaveLength(1);
    expect(datesBody.importantDates.filter((date) => date.source === "manual")).toHaveLength(1);
  });

  it("hands back a clean address book on every visit", async () => {
    const cookie = await startDemo();
    const seed = buildDemoSeed(new Date());
    const added = await api("POST", "/api/contacts", { name: "Added by a visitor" }, cookie);

    expect(added.status).toBe(201);
    expect((await listContacts(cookie)).length).toBe(seed.contacts.length + 1);

    const second = await startDemo();
    const contacts = await listContacts(second);

    expect(contacts.map((contact) => contact.name)).toEqual(
      [...seed.contacts].sort((left, right) => byName(left.name, right.name)).map((contact) => contact.name),
    );
  });

  it("keeps the demo address book away from every other account", async () => {
    await startDemo();

    const stranger = await signInAs("demo-stranger@example.com");

    expect(await listContacts(stranger)).toEqual([]);

    const reminders = await api("GET", "/api/reminders", undefined, stranger);
    const remindersBody = (await reminders.json()) as { reminders: ReminderWithContact[] };

    expect(remindersBody.reminders).toEqual([]);
  });

  it("signs in with the published demo credentials", async () => {
    await startDemo();

    const response = await api("POST", "/api/auth/sign-in/email", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect((await listContacts(sessionCookie(response))).length).toBeGreaterThanOrEqual(8);
  });

  it("arms the reminder engine for the demo account", async () => {
    await startDemo();

    const engine = await reminderEngine(DEMO_EMAIL);
    const alarm = await runInDurableObject(engine, (_instance, state) => state.storage.getAlarm());

    expect(alarm).toBe(Date.parse(`${dayOffset(1)}T00:00:00.000Z`));
  });
});
