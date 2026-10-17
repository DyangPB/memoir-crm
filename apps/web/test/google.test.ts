import type { GoogleStatus } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { overrideGoogleClientFactory } from "../worker/lib/google";
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

async function userIdFor(email: string): Promise<string> {
  const row = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();

  if (row === null) {
    throw new Error(`No user for ${email}`);
  }

  return row.id;
}

/** Stands in for the user having finished Google's consent screen. */
async function grantCalendarAccess(
  email: string,
  scope = `openid email ${CALENDAR_SCOPE}`,
  refreshToken: string | null = "refresh",
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO accounts (id, account_id, provider_id, user_id, scope, access_token, refresh_token, updated_at) VALUES (?, ?, 'google', ?, ?, 'token', ?, ?)",
  )
    .bind(crypto.randomUUID(), `google-${email}`, await userIdFor(email), scope, refreshToken, Date.now())
    .run();
}

async function status(cookie: string): Promise<GoogleStatus> {
  const response = await api("GET", "/api/google/status", undefined, cookie);

  expect(response.status).toBe(200);

  return (await response.json()) as GoogleStatus;
}

async function connected(email: string): Promise<string> {
  const cookie = await signInAs(email);

  await grantCalendarAccess(email);
  expect((await api("POST", "/api/google/connection", undefined, cookie)).status).toBe(200);

  return cookie;
}

describe("google connection", () => {
  it("starts unlinked and unconnected", async () => {
    const cookie = await signInAs("google-fresh@example.com");

    expect(await status(cookie)).toEqual({
      configured: false,
      linked: false,
      connected: false,
      calendars: [],
      lastSyncedAt: null,
      lastError: null,
    });
  });

  it("won't connect before Google has granted calendar access", async () => {
    const cookie = await signInAs("google-unlinked@example.com");
    const response = await api("POST", "/api/google/connection", undefined, cookie);

    expect(response.status).toBe(400);
    expect(fake.memoirCalendarId()).toBeUndefined();
  });

  it("notices calendar access once Google grants it", async () => {
    const email = "google-linked@example.com";
    const cookie = await signInAs(email);

    await grantCalendarAccess(email);

    expect(await status(cookie)).toMatchObject({ linked: true, connected: false });
  });

  it("doesn't count a Google sign-in that was never given calendar access", async () => {
    const email = "google-signin-only@example.com";
    const cookie = await signInAs(email);

    await grantCalendarAccess(email, "openid email profile");

    expect(await status(cookie)).toMatchObject({ linked: false });
    expect((await api("POST", "/api/google/connection", undefined, cookie)).status).toBe(400);
  });

  it("won't connect without lasting access, since sync would stop within the hour", async () => {
    const email = "google-no-refresh@example.com";
    const cookie = await signInAs(email);

    await grantCalendarAccess(email, `openid ${CALENDAR_SCOPE}`, null);

    const response = await api("POST", "/api/google/connection", undefined, cookie);

    expect(response.status).toBe(400);
    expect(fake.memoirCalendarId()).toBeUndefined();
  });

  it("creates the Memoir calendar and shows the primary calendar by default", async () => {
    const cookie = await connected("google-connect@example.com");
    const current = await status(cookie);

    expect(fake.memoirCalendarId()).toBeDefined();
    expect(current).toMatchObject({ linked: true, connected: true, lastError: null });
    expect(current.lastSyncedAt).not.toBeNull();
    expect(current.calendars).toEqual([
      { id: "primary", name: "Personal", primary: true, selected: true },
      { id: "work", name: "Work", primary: false, selected: false },
    ]);
  });

  it("connects only once", async () => {
    const cookie = await connected("google-twice@example.com");

    expect((await api("POST", "/api/google/connection", undefined, cookie)).status).toBe(200);

    expect([...fake.calendars.values()].filter((calendar) => calendar.name === "Memoir")).toHaveLength(1);
  });

  it("makes one Memoir calendar when two connects arrive together", async () => {
    const email = "google-race@example.com";
    const cookie = await signInAs(email);

    await grantCalendarAccess(email);

    const [first, second] = await Promise.all([
      api("POST", "/api/google/connection", undefined, cookie),
      api("POST", "/api/google/connection", undefined, cookie),
    ]);

    expect([first.status, second.status]).toEqual([200, 200]);
    expect([...fake.calendars.values()].filter((calendar) => calendar.name === "Memoir")).toHaveLength(1);
    expect(await status(cookie)).toMatchObject({ connected: true });
  });

  it("reuses its Memoir calendar when the user connects again, without doubling the events", async () => {
    const email = "google-reconnect@example.com";
    const cookie = await signInAs(email);
    const contact = (await (
      await api("POST", "/api/contacts", { name: "Bob Nguyen" }, cookie)
    ).json()) as { contact: { id: string } };

    await api(
      "POST",
      `/api/contacts/${contact.contact.id}/reminders`,
      { body: "Call Bob", dueOn: "2026-10-20" },
      cookie,
    );
    await grantCalendarAccess(email);
    await api("POST", "/api/google/connection", undefined, cookie);
    await api("DELETE", "/api/google/connection", undefined, cookie);
    await api("POST", "/api/google/connection", undefined, cookie);

    const memoirCalendars = [...fake.calendars.values()].filter((calendar) => calendar.name === "Memoir");
    const calendarId = fake.memoirCalendarId() ?? "";

    expect(memoirCalendars).toHaveLength(1);
    expect(fake.eventsIn(calendarId).map((event) => event.summary)).toEqual(["Call Bob"]);
  });

  it("leaves events in the Memoir calendar that Memoir didn't make", async () => {
    const email = "google-reconnect-own@example.com";
    const cookie = await signInAs(email);

    await grantCalendarAccess(email);
    await api("POST", "/api/google/connection", undefined, cookie);
    await api("DELETE", "/api/google/connection", undefined, cookie);

    const calendarId = fake.memoirCalendarId() ?? "";

    fake.addToGoogle(calendarId, "Dentist", "2026-10-22");
    await api("POST", "/api/google/connection", undefined, cookie);

    expect(fake.eventsIn(calendarId).map((event) => event.summary)).toEqual(["Dentist"]);
  });

  it("lets the user pick which Google calendars to show", async () => {
    const cookie = await connected("google-pick@example.com");
    const response = await api("PUT", "/api/google/calendars", { calendarIds: ["work"] }, cookie);

    expect(response.status).toBe(200);
    expect((await status(cookie)).calendars).toEqual([
      { id: "primary", name: "Personal", primary: true, selected: false },
      { id: "work", name: "Work", primary: false, selected: true },
    ]);
  });

  it("refuses calendars that aren't the user's, and the Memoir calendar itself", async () => {
    const cookie = await connected("google-pick-invalid@example.com");
    const memoir = fake.memoirCalendarId();

    expect((await api("PUT", "/api/google/calendars", { calendarIds: ["nope"] }, cookie)).status).toBe(400);
    expect((await api("PUT", "/api/google/calendars", { calendarIds: [memoir] }, cookie)).status).toBe(400);
    expect((await api("PUT", "/api/google/calendars", { calendarIds: "primary" }, cookie)).status).toBe(400);
    expect((await status(cookie)).calendars.find((calendar) => calendar.id === "primary")?.selected).toBe(true);
  });

  it("can't pick calendars before connecting", async () => {
    const cookie = await signInAs("google-pick-early@example.com");

    expect((await api("PUT", "/api/google/calendars", { calendarIds: ["primary"] }, cookie)).status).toBe(409);
  });

  it("disconnects without deleting anything in Google", async () => {
    const cookie = await connected("google-disconnect@example.com");

    expect((await api("DELETE", "/api/google/connection", undefined, cookie)).status).toBe(204);
    expect(await status(cookie)).toMatchObject({ linked: true, connected: false, calendars: [] });
    expect(fake.memoirCalendarId()).toBeDefined();
    expect((await api("DELETE", "/api/google/connection", undefined, cookie)).status).toBe(204);
  });

  it("keeps one user's connection away from another", async () => {
    await connected("google-owner@example.com");
    const stranger = await signInAs("google-stranger@example.com");

    expect(await status(stranger)).toMatchObject({ linked: false, connected: false });
  });

  it("needs a signed-in user", async () => {
    expect((await api("GET", "/api/google/status")).status).toBe(401);
    expect((await api("POST", "/api/google/connection")).status).toBe(401);
    expect((await api("POST", "/api/google/sync")).status).toBe(401);
  });
});
