import type { Contact, OnThisDay } from "@memoir/core";
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

async function createContact(cookie: string, name: string): Promise<Contact> {
  const response = await api("POST", "/api/contacts", { name }, cookie);

  expect(response.status).toBe(201);
  const body = (await response.json()) as { contact: Contact };

  return body.contact;
}

async function logInteraction(
  cookie: string,
  contact: Contact,
  occurredOn: string,
  note: string | null,
): Promise<void> {
  const response = await api(
    "POST",
    `/api/contacts/${contact.id}/interactions`,
    { type: "meeting", occurredOn, note },
    cookie,
  );

  expect(response.status).toBe(201);
}

async function onThisDay(cookie: string, date: string): Promise<OnThisDay | null> {
  const response = await api("GET", `/api/interactions/on-this-day?date=${date}`, undefined, cookie);

  expect(response.status).toBe(200);
  const body = (await response.json()) as { onThisDay: OnThisDay | null };

  return body.onThisDay;
}

describe("on this day", () => {
  it("returns an Interaction from this calendar date in a previous year", async () => {
    const cookie = await signInAs("memory@example.com");
    const maya = await createContact(cookie, "Maya Okafor");
    await logInteraction(cookie, maya, "2024-10-17", "Dinner at the harborside bookstore cafe");

    const result = await onThisDay(cookie, "2026-10-17");

    expect(result).toMatchObject({
      contactId: maya.id,
      contactName: "Maya Okafor",
      occurredOn: "2024-10-17",
      note: "Dinner at the harborside bookstore cafe",
      yearsAgo: 2,
    });
  });

  it("prefers the most recent previous year when several match", async () => {
    const cookie = await signInAs("several@example.com");
    const maya = await createContact(cookie, "Maya Okafor");
    await logInteraction(cookie, maya, "2022-10-17", "Three years back");
    await logInteraction(cookie, maya, "2025-10-17", "Last year");

    const result = await onThisDay(cookie, "2026-10-17");

    expect(result).toMatchObject({ note: "Last year", yearsAgo: 1 });
  });

  it("returns null when nothing happened on this date in a previous year", async () => {
    const cookie = await signInAs("quiet@example.com");
    const maya = await createContact(cookie, "Maya Okafor");
    await logInteraction(cookie, maya, "2026-10-17", "Today does not count");
    await logInteraction(cookie, maya, "2025-10-18", "A day off");
    await logInteraction(cookie, maya, "2025-11-17", "A month off");

    expect(await onThisDay(cookie, "2026-10-17")).toBeNull();
  });

  it("never shows another user's Interaction", async () => {
    const owner = await signInAs("owner-memory@example.com");
    const maya = await createContact(owner, "Maya Okafor");
    await logInteraction(owner, maya, "2024-10-17", "Private");
    const stranger = await signInAs("stranger-memory@example.com");

    expect(await onThisDay(stranger, "2026-10-17")).toBeNull();
  });

  it("rejects a missing or malformed date", async () => {
    const cookie = await signInAs("baddate@example.com");

    expect((await api("GET", "/api/interactions/on-this-day", undefined, cookie)).status).toBe(400);
    expect(
      (await api("GET", "/api/interactions/on-this-day?date=yesterday", undefined, cookie)).status,
    ).toBe(400);
  });

  it("requires a session", async () => {
    const response = await api("GET", "/api/interactions/on-this-day?date=2026-10-17");

    expect(response.status).toBe(401);
  });
});
