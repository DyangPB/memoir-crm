import type { CadenceHealth, Contact } from "@memoir/core";
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

async function getSettings(cookie: string): Promise<number> {
  const response = await api("GET", "/api/settings", undefined, cookie);

  expect(response.status).toBe(200);

  return ((await response.json()) as { settings: { defaultCadenceDays: number } }).settings
    .defaultCadenceDays;
}

describe("the global Cadence in Settings", () => {
  it("starts at 30 days and can be changed", async () => {
    const cookie = await signInAs("settings-owner@example.com");

    expect(await getSettings(cookie)).toBe(30);

    const saved = await api("PUT", "/api/settings", { defaultCadenceDays: 14 }, cookie);

    expect(saved.status).toBe(200);
    expect(await getSettings(cookie)).toBe(14);
  });

  it("rejects a Cadence that isn't a whole number of days", async () => {
    const cookie = await signInAs("settings-bad@example.com");

    for (const bad of [0, -1, 2.5, "7", null]) {
      const response = await api("PUT", "/api/settings", { defaultCadenceDays: bad }, cookie);

      expect(response.status).toBe(400);
    }

    expect(await getSettings(cookie)).toBe(30);
  });

  it("is private to each user and needs a session", async () => {
    const alice = await signInAs("settings-alice@example.com");
    const bob = await signInAs("settings-bob@example.com");

    await api("PUT", "/api/settings", { defaultCadenceDays: 7 }, alice);

    expect(await getSettings(bob)).toBe(30);
    expect((await api("GET", "/api/settings")).status).toBe(401);
    expect((await api("PUT", "/api/settings", { defaultCadenceDays: 7 })).status).toBe(401);
  });
});

async function createContact(cookie: string, body: Record<string, unknown>): Promise<Contact> {
  const response = await api("POST", "/api/contacts", { name: "Contact", ...body }, cookie);

  expect(response.status).toBe(201);

  return ((await response.json()) as { contact: Contact }).contact;
}

async function getContact(cookie: string, id: string): Promise<Contact> {
  const response = await api("GET", `/api/contacts/${id}`, undefined, cookie);

  expect(response.status).toBe(200);

  return ((await response.json()) as { contact: Contact }).contact;
}

describe("a Contact's own Cadence", () => {
  it("follows the global Cadence until it has an override", async () => {
    const cookie = await signInAs("contact-cadence@example.com");
    const plain = await createContact(cookie, {});

    expect(plain.cadenceDays).toBeNull();
    expect(plain.cadenceTracked).toBe(true);
    expect(plain.effectiveCadenceDays).toBe(30);

    await api("PUT", "/api/settings", { defaultCadenceDays: 14 }, cookie);

    expect((await getContact(cookie, plain.id)).effectiveCadenceDays).toBe(14);

    const weekly = await createContact(cookie, { cadenceDays: 7 });

    expect(weekly.cadenceDays).toBe(7);
    expect((await getContact(cookie, weekly.id)).effectiveCadenceDays).toBe(7);
  });

  it("can be overridden and opted out later, and the choice is kept", async () => {
    const cookie = await signInAs("contact-cadence-edit@example.com");
    const contact = await createContact(cookie, {});

    const overridden = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Contact", cadenceDays: 90 },
      cookie,
    );

    expect(((await overridden.json()) as { contact: Contact }).contact.effectiveCadenceDays).toBe(90);

    const optedOut = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Contact", cadenceDays: 90, cadenceTracked: false },
      cookie,
    );

    expect(optedOut.status).toBe(200);

    const reloaded = await getContact(cookie, contact.id);

    expect(reloaded.cadenceTracked).toBe(false);
    expect(reloaded.effectiveCadenceDays).toBeNull();

    const list = await api("GET", "/api/contacts", undefined, cookie);
    const listed = ((await list.json()) as { contacts: Contact[] }).contacts;

    expect(listed.find((entry) => entry.id === contact.id)?.effectiveCadenceDays).toBeNull();
  });

  it("rejects an invalid override", async () => {
    const cookie = await signInAs("contact-cadence-bad@example.com");
    const response = await api("POST", "/api/contacts", { name: "Contact", cadenceDays: 0 }, cookie);

    expect(response.status).toBe(400);
  });
});

const TODAY = "2026-10-17";

function daysAgo(days: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00.000Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

async function talkedTo(cookie: string, contact: Contact, daysBack: number): Promise<void> {
  const response = await api(
    "POST",
    `/api/contacts/${contact.id}/interactions`,
    { type: "call", occurredOn: daysAgo(daysBack), note: null },
    cookie,
  );

  expect(response.status).toBe(201);
}

type CadenceReport = {
  defaultCadenceDays: number;
  health: CadenceHealth | null;
  catchUp: (Contact & { daysSince: number })[];
};

async function getCadence(cookie: string, date = TODAY): Promise<CadenceReport> {
  const response = await api("GET", `/api/cadence?date=${date}`, undefined, cookie);

  expect(response.status).toBe(200);

  return (await response.json()) as CadenceReport;
}

describe("the catch-up list and Cadence Health", () => {
  async function seedAddressBook(cookie: string): Promise<Record<string, Contact>> {
    const book: Record<string, Contact> = {};
    const people: [string, Record<string, unknown>, number | null][] = [
      ["quiet", {}, 45],
      ["fresh", {}, 5],
      ["weekly", { cadenceDays: 7 }, 10],
      ["yearly", { cadenceDays: 365 }, 100],
      ["opted-out", { cadenceTracked: false }, 400],
      ["new", {}, null],
    ];

    for (const [name, settings, daysBack] of people) {
      const contact = await createContact(cookie, { name, ...settings });

      if (daysBack !== null) {
        await talkedTo(cookie, contact, daysBack);
      }

      book[name] = contact;
    }

    return book;
  }

  it("lists exactly the Contacts past their own Cadence, quietest first", async () => {
    const cookie = await signInAs("catch-up@example.com");
    const book = await seedAddressBook(cookie);
    const report = await getCadence(cookie);

    expect(report.catchUp.map((contact) => [contact.id, contact.daysSince])).toEqual([
      [book.quiet?.id, 45],
      [book.weekly?.id, 10],
    ]);
  });

  it("measures Cadence Health across the tracked Contacts that have been talked to", async () => {
    const cookie = await signInAs("health@example.com");

    expect((await getCadence(cookie)).health).toBeNull();

    await seedAddressBook(cookie);

    expect((await getCadence(cookie)).health).toEqual({ tracked: 4, inTouch: 2, percent: 50 });
  });

  it("follows the global Cadence when it changes", async () => {
    const cookie = await signInAs("catch-up-default@example.com");
    const book = await seedAddressBook(cookie);

    await api("PUT", "/api/settings", { defaultCadenceDays: 3 }, cookie);

    const report = await getCadence(cookie);

    expect(report.defaultCadenceDays).toBe(3);
    expect(report.catchUp.map((contact) => contact.id)).toEqual([
      book.quiet?.id,
      book.weekly?.id,
      book.fresh?.id,
    ]);
    expect(report.health).toEqual({ tracked: 4, inTouch: 1, percent: 25 });
  });

  it("only looks at the signed-in user's Contacts, and needs the client's day", async () => {
    const owner = await signInAs("catch-up-owner@example.com");
    const stranger = await signInAs("catch-up-stranger@example.com");

    await seedAddressBook(owner);

    const strangerReport = await getCadence(stranger);

    expect(strangerReport.catchUp).toEqual([]);
    expect(strangerReport.health).toBeNull();
    expect((await api("GET", `/api/cadence?date=${TODAY}`)).status).toBe(401);
    expect((await api("GET", "/api/cadence", undefined, owner)).status).toBe(400);
  });
});
