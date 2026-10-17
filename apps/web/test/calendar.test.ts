import type { CalendarItem, Contact, Reminder } from "@memoir/core";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";

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

async function createContact(
  cookie: string,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<Contact> {
  const response = await api("POST", "/api/contacts", { name, ...extra }, cookie);

  expect(response.status).toBe(201);

  return ((await response.json()) as { contact: Contact }).contact;
}

async function createReminder(
  cookie: string,
  contactId: string,
  body: string,
  dueOn: string,
): Promise<Reminder> {
  const response = await api("POST", `/api/contacts/${contactId}/reminders`, { body, dueOn }, cookie);

  expect(response.status).toBe(201);

  return ((await response.json()) as { reminder: Reminder }).reminder;
}

async function createImportantDate(
  cookie: string,
  contactId: string,
  name: string,
  fallsOn: string,
): Promise<void> {
  const response = await api(
    "POST",
    `/api/contacts/${contactId}/important-dates`,
    { name, fallsOn },
    cookie,
  );

  expect(response.status).toBe(201);
}

async function feed(cookie: string, from: string, to: string): Promise<CalendarItem[]> {
  const response = await api("GET", `/api/calendar?from=${from}&to=${to}`, undefined, cookie);

  expect(response.status).toBe(200);

  return ((await response.json()) as { items: CalendarItem[] }).items;
}

describe("calendar feed", () => {
  it("returns Reminders and Important Dates in the range, each tagged by layer", async () => {
    const cookie = await signInAs("calendar-feed@example.com");
    const bob = await createContact(cookie, "Bob Nguyen");
    const ada = await createContact(cookie, "Ada Lovelace");
    const call = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await createReminder(cookie, ada.id, "Too early", "2026-09-30");
    await createReminder(cookie, ada.id, "Too late", "2026-11-01");
    await createImportantDate(cookie, ada.id, "Anniversary", "2015-10-05");

    const items = await feed(cookie, "2026-10-01", "2026-10-31");

    expect(items).toEqual([
      {
        kind: "important-date",
        id: expect.any(String),
        label: "Anniversary",
        date: "2026-10-05",
        contactId: ada.id,
        contactName: "Ada Lovelace",
        yearsOld: 11,
      },
      {
        kind: "reminder",
        id: call.id,
        title: "Call Bob",
        date: "2026-10-20",
        contactId: bob.id,
        contactName: "Bob Nguyen",
        done: false,
      },
    ]);
  });

  it("includes a ticked-off Reminder, marked done", async () => {
    const cookie = await signInAs("calendar-done@example.com");
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await api("POST", `/api/contacts/${bob.id}/reminders/${reminder.id}/tick`, undefined, cookie);

    expect(await feed(cookie, "2026-10-20", "2026-10-20")).toMatchObject([
      { kind: "reminder", id: reminder.id, done: true },
    ]);
  });

  it("includes a birthday saved on a Contact", async () => {
    const cookie = await signInAs("calendar-birthday@example.com");
    const bob = await createContact(cookie, "Bob Nguyen", { birthday: "1992-10-23" });

    expect(await feed(cookie, "2026-10-01", "2026-10-31")).toMatchObject([
      { kind: "important-date", label: "Birthday", date: "2026-10-23", contactId: bob.id, yearsOld: 34 },
    ]);
  });

  it("repeats a yearly date for each year a long range spans", async () => {
    const cookie = await signInAs("calendar-years@example.com");
    const bob = await createContact(cookie, "Bob Nguyen");
    await createImportantDate(cookie, bob.id, "Anniversary", "2015-06-10");

    const items = await feed(cookie, "2026-06-01", "2027-06-30");

    expect(items.map((item) => item.date)).toEqual(["2026-06-10", "2027-06-10"]);
  });

  it("is empty when nothing falls in the range", async () => {
    const cookie = await signInAs("calendar-empty@example.com");

    expect(await feed(cookie, "2026-10-01", "2026-10-31")).toEqual([]);
  });

  it("asks for a real range", async () => {
    const cookie = await signInAs("calendar-validation@example.com");
    const bad = async (query: string) =>
      (await api("GET", `/api/calendar${query}`, undefined, cookie)).status;

    expect(await bad("")).toBe(400);
    expect(await bad("?from=2026-10-01")).toBe(400);
    expect(await bad("?from=2026-10-01&to=nonsense")).toBe(400);
    expect(await bad("?from=2026-02-31&to=2026-03-01")).toBe(400);
    expect(await bad("?from=2026-10-31&to=2026-10-01")).toBe(400);
    expect(await bad("?from=2026-01-01&to=2028-01-01")).toBe(400);
    expect(await bad("?from=2026-01-01&to=2027-01-31")).toBe(200);
    expect(await bad("?from=2026-10-01&to=2026-10-01")).toBe(200);
  });

  it("keeps one user's calendar out of another's", async () => {
    const owner = await signInAs("calendar-owner@example.com");
    const stranger = await signInAs("calendar-stranger@example.com");
    const contact = await createContact(owner, "Zebra Keeper", { birthday: "1990-10-10" });
    await createReminder(owner, contact.id, "Call Zebra", "2026-10-12");

    expect(await feed(owner, "2026-10-01", "2026-10-31")).toHaveLength(2);
    expect(await feed(stranger, "2026-10-01", "2026-10-31")).toEqual([]);
  });

  it("needs a signed-in user", async () => {
    expect((await api("GET", "/api/calendar?from=2026-10-01&to=2026-10-31")).status).toBe(401);
  });
});
