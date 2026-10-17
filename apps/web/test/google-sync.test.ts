import type { CalendarItem, Contact, GoogleStatus, Reminder } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAuthError, overrideGoogleClientFactory } from "../worker/lib/google";
import { FakeGoogle } from "./fake-google";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

let fake: FakeGoogle;

beforeEach(() => {
  fake = new FakeGoogle();
  overrideGoogleClientFactory(async () => fake);
});

afterEach(() => {
  overrideGoogleClientFactory(null);
});

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

async function grantCalendarAccess(email: string): Promise<void> {
  const row = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();

  await env.DB.prepare(
    "INSERT INTO accounts (id, account_id, provider_id, user_id, scope, access_token, refresh_token, updated_at) VALUES (?, ?, 'google', ?, ?, 'token', 'refresh', ?)",
  )
    .bind(crypto.randomUUID(), `google-${email}`, row?.id, `openid ${CALENDAR_SCOPE}`, Date.now())
    .run();
}

async function connect(cookie: string, email: string): Promise<void> {
  await grantCalendarAccess(email);
  expect((await api("POST", "/api/google/connection", undefined, cookie)).status).toBe(200);
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
): Promise<string> {
  const response = await api(
    "POST",
    `/api/contacts/${contactId}/important-dates`,
    { name, fallsOn },
    cookie,
  );

  expect(response.status).toBe(201);

  return ((await response.json()) as { importantDate: { id: string } }).importantDate.id;
}

async function syncNow(cookie: string): Promise<Response> {
  return api("POST", "/api/google/sync", undefined, cookie);
}

async function listReminders(cookie: string, contactId: string): Promise<Reminder[]> {
  const response = await api("GET", `/api/contacts/${contactId}/reminders`, undefined, cookie);

  return ((await response.json()) as { reminders: Reminder[] }).reminders;
}

function memoirEvents() {
  const calendarId = fake.memoirCalendarId();

  return calendarId === undefined ? [] : fake.eventsIn(calendarId);
}

function memoirCalendar(): string {
  const id = fake.memoirCalendarId();

  if (id === undefined) {
    throw new Error("Memoir calendar was never created");
  }

  return id;
}

describe("the first sync", () => {
  it("puts every dated Reminder and Important Date on the Memoir calendar", async () => {
    const email = "gsync-first@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await createImportantDate(cookie, bob.id, "Anniversary", "2015-06-10");

    await connect(cookie, email);

    expect(memoirEvents().map((event) => event.summary).sort()).toEqual([
      "Anniversary (Bob Nguyen)",
      "Call Bob",
    ]);

    const call = memoirEvents().find((event) => event.summary === "Call Bob");
    const anniversary = memoirEvents().find((event) => event.summary.startsWith("Anniversary"));

    expect(call).toMatchObject({ startDate: "2026-10-20", recurrence: null, memoirKind: "reminder" });
    expect(anniversary).toMatchObject({
      startDate: "2015-06-10",
      recurrence: ["RRULE:FREQ=YEARLY"],
      memoirKind: "important-date",
    });
  });

  it("leaves a Reminder that is already done off Google", async () => {
    const email = "gsync-done-first@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await api("POST", `/api/contacts/${bob.id}/reminders/${reminder.id}/tick`, undefined, cookie);
    await connect(cookie, email);

    expect(memoirEvents()).toEqual([]);
  });

  it("puts a Contact's birthday on Google as a yearly event", async () => {
    const email = "gsync-birthday@example.com";
    const cookie = await signInAs(email);

    await createContact(cookie, "Bob Nguyen", { birthday: "1992-10-23" });
    await connect(cookie, email);

    expect(memoirEvents()).toMatchObject([
      { summary: "Birthday (Bob Nguyen)", startDate: "1992-10-23", recurrence: ["RRULE:FREQ=YEARLY"] },
    ]);
  });

  it("records when it last synced", async () => {
    const email = "gsync-status@example.com";
    const cookie = await signInAs(email);

    await connect(cookie, email);

    const status = (await (await api("GET", "/api/google/status", undefined, cookie)).json()) as GoogleStatus;

    expect(status.lastSyncedAt).not.toBeNull();
    expect(status.lastError).toBeNull();
  });
});

describe("pushing changes made in Memoir", () => {
  it("pushes a Reminder as soon as it is created", async () => {
    const email = "gsync-create@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await connect(cookie, email);
    await createReminder(cookie, bob.id, "Send a card", "2026-11-02");

    await vi.waitFor(() => expect(memoirEvents().map((event) => event.summary)).toEqual(["Send a card"]));
  });

  it("moves the event when a Reminder is rescheduled or renamed", async () => {
    const email = "gsync-edit@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await connect(cookie, email);
    await api(
      "PATCH",
      `/api/contacts/${bob.id}/reminders/${reminder.id}`,
      { dueOn: "2026-10-27" },
      cookie,
    );

    await vi.waitFor(() => expect(memoirEvents()[0]?.startDate).toBe("2026-10-27"));
    expect(memoirEvents()).toHaveLength(1);
  });

  it("removes the event when a Reminder is ticked off", async () => {
    const email = "gsync-tick@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await connect(cookie, email);
    expect(memoirEvents()).toHaveLength(1);

    await api("POST", `/api/contacts/${bob.id}/reminders/${reminder.id}/tick`, undefined, cookie);

    await vi.waitFor(() => expect(memoirEvents()).toEqual([]));
  });

  it("removes the event when a Reminder is deleted", async () => {
    const email = "gsync-delete@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await connect(cookie, email);
    await api("DELETE", `/api/contacts/${bob.id}/reminders/${reminder.id}`, undefined, cookie);

    await vi.waitFor(() => expect(memoirEvents()).toEqual([]));
  });

  it("removes a Contact's events when the Contact is deleted", async () => {
    const email = "gsync-contact-delete@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen", { birthday: "1992-10-23" });
    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await connect(cookie, email);
    expect(memoirEvents()).toHaveLength(2);

    await api("DELETE", `/api/contacts/${bob.id}`, undefined, cookie);

    await vi.waitFor(() => expect(memoirEvents()).toEqual([]));
  });

  it("stops pushing once disconnected", async () => {
    const email = "gsync-disconnected@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await connect(cookie, email);
    await api("DELETE", "/api/google/connection", undefined, cookie);
    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(memoirEvents()).toEqual([]);
  });

  it("doesn't push for someone who never connected", async () => {
    const email = "gsync-bystander@example.com";
    const cookie = await signInAs(email);
    const owner = "gsync-bystander-owner@example.com";
    const ownerCookie = await signInAs(owner);

    await connect(ownerCookie, owner);

    const bob = await createContact(cookie, "Bob Nguyen");
    await createReminder(cookie, bob.id, "Private", "2026-10-20");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(memoirEvents()).toEqual([]);
  });
});

describe("pulling changes made in Google", () => {
  it("updates a Reminder when its event is edited", async () => {
    const email = "gsync-pull-edit@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await connect(cookie, email);

    const event = memoirEvents()[0];

    fake.editInGoogle(memoirCalendar(), event?.id ?? "", {
      summary: "Call Bob on his mobile",
      startDate: "2026-10-23",
    });

    expect((await syncNow(cookie)).status).toBe(200);
    expect(await listReminders(cookie, bob.id)).toMatchObject([
      { id: reminder.id, body: "Call Bob on his mobile", dueOn: "2026-10-23", status: "pending" },
    ]);
  });

  it("deletes a Reminder when its event is deleted", async () => {
    const email = "gsync-pull-delete@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await connect(cookie, email);
    fake.deleteInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "");

    expect((await syncNow(cookie)).status).toBe(200);
    expect(await listReminders(cookie, bob.id)).toEqual([]);
  });

  it("deletes a Reminder whose event is missing from a full listing", async () => {
    const email = "gsync-pull-expired@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await connect(cookie, email);
    fake.deleteInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "");
    fake.expireNextToken = true;

    expect((await syncNow(cookie)).status).toBe(200);
    expect(await listReminders(cookie, bob.id)).toEqual([]);
  });

  it("renames and deletes an Important Date the same way", async () => {
    const email = "gsync-pull-date@example.com";
    const cookie = await signInAs(email);
    const ada = await createContact(cookie, "Ada Lovelace");
    const dateId = await createImportantDate(cookie, ada.id, "Anniversary", "2015-06-10");

    await connect(cookie, email);
    fake.editInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "", {
      summary: "Wedding day (Ada Lovelace)",
      startDate: "2015-06-12",
    });
    await syncNow(cookie);

    const listed = (await (
      await api("GET", `/api/contacts/${ada.id}/important-dates`, undefined, cookie)
    ).json()) as { importantDates: { id: string; name: string; fallsOn: string }[] };

    expect(listed.importantDates).toMatchObject([{ id: dateId, name: "Wedding day", fallsOn: "2015-06-12" }]);

    fake.deleteInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "");
    await syncNow(cookie);

    const after = (await (
      await api("GET", `/api/contacts/${ada.id}/important-dates`, undefined, cookie)
    ).json()) as { importantDates: unknown[] };

    expect(after.importantDates).toEqual([]);
  });

  it("puts a birthday back the way Memoir has it", async () => {
    const email = "gsync-pull-birthday@example.com";
    const cookie = await signInAs(email);

    await createContact(cookie, "Bob Nguyen", { birthday: "1992-10-23" });
    await connect(cookie, email);
    fake.editInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "", { summary: "Renamed" });
    await syncNow(cookie);

    expect(memoirEvents().map((event) => event.summary)).toEqual(["Birthday (Bob Nguyen)"]);

    fake.deleteInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "");
    await syncNow(cookie);

    expect(memoirEvents().map((event) => event.summary)).toEqual(["Birthday (Bob Nguyen)"]);
  });

  it("keeps a Google edit that arrived while the reminder engine was updating its status", async () => {
    const email = "gsync-pull-status@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");
    const reminder = await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");

    await connect(cookie, email);
    fake.editInGoogle(memoirCalendar(), memoirEvents()[0]?.id ?? "", { summary: "Edited in Google" });
    // The engine moves Reminders along (due, overdue), which touches their updatedAt.
    await env.DB.prepare("UPDATE reminders SET status = 'overdue', updated_at = ? WHERE id = ?")
      .bind(Date.now() + 5_000, reminder.id)
      .run();
    await syncNow(cookie);

    expect((await listReminders(cookie, bob.id))[0]?.body).toBe("Edited in Google");
  });
});

describe("running steadily", () => {
  it("does nothing the second time when nothing changed", async () => {
    const email = "gsync-steady@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await connect(cookie, email);

    const before = JSON.stringify(memoirEvents());
    const inserts = fake.inserts;

    await syncNow(cookie);
    await syncNow(cookie);

    expect(fake.inserts).toBe(inserts);
    expect(JSON.stringify(memoirEvents())).toBe(before);
  });

  it("never pushes an item twice when two syncs overlap", async () => {
    const email = "gsync-overlap@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await connect(cookie, email);
    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await Promise.all([syncNow(cookie), syncNow(cookie), syncNow(cookie)]);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(memoirEvents()).toHaveLength(1);
  });

  it("reports a Google failure and recovers on the next try", async () => {
    const email = "gsync-failure@example.com";
    const cookie = await signInAs(email);

    await connect(cookie, email);
    fake.failure = new Error("Google is down");

    const failed = await syncNow(cookie);

    expect(failed.status).toBe(502);
    expect(
      ((await (await api("GET", "/api/google/status", undefined, cookie)).json()) as GoogleStatus).lastError,
    ).toBe("The sync didn't finish. Try again in a moment.");

    fake.failure = null;

    expect((await syncNow(cookie)).status).toBe(200);
    expect(
      ((await (await api("GET", "/api/google/status", undefined, cookie)).json()) as GoogleStatus).lastError,
    ).toBeNull();
  });

  it("asks the user to connect again when Google turns the sign-in down", async () => {
    const email = "gsync-auth@example.com";
    const cookie = await signInAs(email);

    await connect(cookie, email);
    fake.failure = new GoogleAuthError("Connect Google Calendar again.");

    expect((await syncNow(cookie)).status).toBe(502);
    expect(
      ((await (await api("GET", "/api/google/status", undefined, cookie)).json()) as GoogleStatus).lastError,
    ).toBe("Connect Google Calendar again.");
  });

  it("can't sync before connecting", async () => {
    const cookie = await signInAs("gsync-early@example.com");

    expect((await syncNow(cookie)).status).toBe(409);
  });
});

describe("Google calendars on the Calendar", () => {
  async function feed(cookie: string): Promise<CalendarItem[]> {
    const response = await api("GET", "/api/calendar?from=2026-10-01&to=2026-10-31", undefined, cookie);

    expect(response.status).toBe(200);

    return ((await response.json()) as { items: CalendarItem[] }).items;
  }

  it("shows events from the chosen calendars as a read-only layer", async () => {
    const email = "gsync-layer@example.com";
    const cookie = await signInAs(email);

    await connect(cookie, email);
    fake.addToGoogle("primary", "Dinner", "2026-10-20");
    fake.addToGoogle("work", "Standup", "2026-10-21");

    expect(await feed(cookie)).toEqual([
      {
        kind: "google",
        id: expect.any(String),
        title: "Dinner",
        date: "2026-10-20",
        start: "2026-10-20",
        end: "2026-10-21",
        calendarId: "primary",
        meetUrl: null,
      },
    ]);

    await api("PUT", "/api/google/calendars", { calendarIds: ["primary", "work"] }, cookie);

    expect((await feed(cookie)).map((item) => item.kind === "google" && item.title)).toEqual([
      "Dinner",
      "Standup",
    ]);
  });

  it("shows a multi-day event on every day it covers, even one that began before the range", async () => {
    const email = "gsync-layer-multi@example.com";
    const cookie = await signInAs(email);

    await connect(cookie, email);
    fake.addToGoogle("primary", "Trip", "2026-09-29", "2026-10-03");
    fake.addToGoogle("primary", "Conference", "2026-10-30", "2026-11-02");

    const items = await feed(cookie);

    expect(items.map((item) => item.kind === "google" && `${item.title} ${item.date}`)).toEqual([
      "Trip 2026-10-01",
      "Trip 2026-10-02",
      "Conference 2026-10-30",
      "Conference 2026-10-31",
    ]);
  });

  it("doesn't show the Memoir calendar's own events twice", async () => {
    const email = "gsync-layer-own@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await connect(cookie, email);

    expect((await feed(cookie)).map((item) => item.kind)).toEqual(["reminder"]);
  });

  it("still shows Memoir's own items when Google can't be reached", async () => {
    const email = "gsync-layer-down@example.com";
    const cookie = await signInAs(email);
    const bob = await createContact(cookie, "Bob Nguyen");

    await createReminder(cookie, bob.id, "Call Bob", "2026-10-20");
    await connect(cookie, email);
    fake.failure = new Error("Google is down");

    expect((await feed(cookie)).map((item) => item.kind)).toEqual(["reminder"]);
  });

  it("shows nothing from Google to someone who isn't connected", async () => {
    const cookie = await signInAs("gsync-layer-none@example.com");

    fake.addToGoogle("primary", "Dinner", "2026-10-20");

    expect(await feed(cookie)).toEqual([]);
  });
});
