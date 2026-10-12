import type { Contact, ImportantDate, ImportantDateWithContact } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
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
  const header =
    fromGetSetCookie !== "" ? fromGetSetCookie : (response.headers.get("set-cookie") ?? "");
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
  birthday?: string,
): Promise<Contact> {
  const response = await api(
    "POST",
    "/api/contacts",
    birthday === undefined ? { name } : { name, birthday },
    cookie,
  );

  expect(response.status).toBe(201);
  const body = (await response.json()) as { contact: Contact };

  return body.contact;
}

async function addImportantDate(
  cookie: string,
  contactId: string,
  name: string,
  fallsOn: string,
): Promise<ImportantDate> {
  const response = await api(
    "POST",
    `/api/contacts/${contactId}/important-dates`,
    { name, fallsOn },
    cookie,
  );

  expect(response.status).toBe(201);
  const payload = (await response.json()) as { importantDate: ImportantDate };

  return payload.importantDate;
}

async function listContactImportantDates(
  cookie: string,
  contactId: string,
): Promise<ImportantDate[]> {
  const response = await api("GET", `/api/contacts/${contactId}/important-dates`, undefined, cookie);

  expect(response.status).toBe(200);
  const body = (await response.json()) as { importantDates: ImportantDate[] };

  return body.importantDates;
}

async function listFeed(
  cookie: string,
): Promise<{ importantDates: ImportantDateWithContact[] }> {
  const response = await api("GET", "/api/important-dates", undefined, cookie);

  expect(response.status).toBe(200);

  return (await response.json()) as { importantDates: ImportantDateWithContact[] };
}

describe("important dates", () => {
  it("adds an important date to a contact, and lists it back", async () => {
    const cookie = await signInAs("important-dates-create@example.com");
    const contact = await createContact(cookie, "Bob Nguyen");

    const response = await api(
      "POST",
      `/api/contacts/${contact.id}/important-dates`,
      { name: "  First met  ", fallsOn: "2019-05-04" },
      cookie,
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as { importantDate: ImportantDate };
    expect(payload.importantDate).toEqual({
      id: expect.any(String),
      contactId: contact.id,
      name: "First met",
      fallsOn: "2019-05-04",
      source: "manual",
      createdAt: expect.any(String),
    });

    const row = await env.DB.prepare(
      "SELECT name, falls_on, source FROM important_dates WHERE id = ?",
    )
      .bind(payload.importantDate.id)
      .first<{ name: string; falls_on: string; source: string }>();
    expect(row).toEqual({ name: "First met", falls_on: "2019-05-04", source: "manual" });

    const listed = await listContactImportantDates(cookie, contact.id);
    expect(listed).toEqual([payload.importantDate]);
  });

  it("rejects a blank name or an impossible date", async () => {
    const cookie = await signInAs("important-dates-validation@example.com");
    const contact = await createContact(cookie, "Marco Silva");
    const path = `/api/contacts/${contact.id}/important-dates`;

    expect((await api("POST", path, { name: "   ", fallsOn: "2019-05-04" }, cookie)).status).toBe(
      400,
    );
    expect(
      (await api("POST", path, { name: "First met", fallsOn: "2019-02-31" }, cookie)).status,
    ).toBe(400);
  });

  it("removes an important date, and removes them all with the contact", async () => {
    const cookie = await signInAs("important-dates-delete@example.com");
    const contact = await createContact(cookie, "Lena Fischer");
    const importantDate = await addImportantDate(cookie, contact.id, "First met", "2019-05-04");
    const path = `/api/contacts/${contact.id}/important-dates/${importantDate.id}`;

    expect((await api("DELETE", path, undefined, cookie)).status).toBe(204);
    expect((await api("DELETE", path, undefined, cookie)).status).toBe(404);

    const cascade = await createContact(cookie, "Ada Lovelace");
    await addImportantDate(cookie, cascade.id, "First met", "2020-01-01");
    await api("DELETE", `/api/contacts/${cascade.id}`, undefined, cookie);

    const remaining = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM important_dates WHERE contact_id = ?",
    )
      .bind(cascade.id)
      .first<{ count: number }>();
    expect(remaining?.count).toBe(0);
  });

  it("hides another user's important dates from every verb", async () => {
    const owner = await signInAs("important-dates-owner@example.com");
    const stranger = await signInAs("important-dates-stranger@example.com");
    const contact = await createContact(owner, "Dana Reyes");
    const importantDate = await addImportantDate(owner, contact.id, "First met", "2019-05-04");
    const path = `/api/contacts/${contact.id}/important-dates`;

    expect((await api("GET", path, undefined, stranger)).status).toBe(404);
    expect((await api("POST", path, { name: "Intrusion", fallsOn: "2019-05-04" }, stranger)).status).toBe(
      404,
    );
    expect((await api("DELETE", `${path}/${importantDate.id}`, undefined, stranger)).status).toBe(
      404,
    );

    expect(await listContactImportantDates(owner, contact.id)).toHaveLength(1);
  });
});

describe("birthday important dates", () => {
  it("turns a contact's birthday into an important date automatically", async () => {
    const cookie = await signInAs("birthday-auto@example.com");
    const contact = await createContact(cookie, "Ada Lovelace", "1985-03-14");

    expect(await listContactImportantDates(cookie, contact.id)).toEqual([
      {
        id: expect.any(String),
        contactId: contact.id,
        name: "Birthday",
        fallsOn: "1985-03-14",
        source: "birthday",
        createdAt: expect.any(String),
      },
    ]);
  });

  it("moves the important date when the birthday changes", async () => {
    const cookie = await signInAs("birthday-change@example.com");
    const contact = await createContact(cookie, "Kofi Mensah", "1985-03-14");

    const update = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Kofi Mensah", birthday: "1990-07-02" },
      cookie,
    );
    expect(update.status).toBe(200);

    const listed = await listContactImportantDates(cookie, contact.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ name: "Birthday", fallsOn: "1990-07-02", source: "birthday" });
  });

  it("removes the birthday important date when the birthday is cleared", async () => {
    const cookie = await signInAs("birthday-clear@example.com");
    const contact = await createContact(cookie, "Ines Okafor", "1985-03-14");

    const update = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Ines Okafor", birthday: null },
      cookie,
    );
    expect(update.status).toBe(200);

    expect(await listContactImportantDates(cookie, contact.id)).toEqual([]);
  });

  it("keeps a hand-added important date when the birthday is cleared", async () => {
    const cookie = await signInAs("birthday-keep-manual@example.com");
    const contact = await createContact(cookie, "Sofia Marchetti", "1985-03-14");
    const manual = await addImportantDate(cookie, contact.id, "First met", "2019-05-04");

    await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Sofia Marchetti", birthday: null },
      cookie,
    );

    expect(await listContactImportantDates(cookie, contact.id)).toEqual([manual]);
  });

  it("keeps one birthday row when the birthday is saved again unchanged", async () => {
    const cookie = await signInAs("birthday-twice@example.com");
    const contact = await createContact(cookie, "Zoe Hart", "1985-03-14");

    await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Zoe Hart", birthday: "1985-03-14" },
      cookie,
    );

    expect(await listContactImportantDates(cookie, contact.id)).toHaveLength(1);
  });
});

describe("the reminders page feed", () => {
  it("lists every important date with its contact, and nobody else's", async () => {
    const cookie = await signInAs("important-dates-feed@example.com");
    const stranger = await signInAs("important-dates-feed-stranger@example.com");
    const bob = await createContact(cookie, "Bob Nguyen", "1985-03-14");
    const ada = await createContact(cookie, "Ada Lovelace");
    await addImportantDate(cookie, ada.id, "First met", "2019-05-04");
    await createContact(stranger, "Zebra Keeper", "1985-03-14");

    const { importantDates } = await listFeed(cookie);

    expect(importantDates.map((item) => [item.contactName, item.name, item.source])).toEqual([
      ["Ada Lovelace", "First met", "manual"],
      ["Bob Nguyen", "Birthday", "birthday"],
    ]);
    expect(importantDates.find((item) => item.contactId === bob.id)?.id).toEqual(expect.any(String));
  });

  it("keeps a date that already passed this year, and holds its original year", async () => {
    const cookie = await signInAs("important-dates-recurs@example.com");
    const contact = await createContact(cookie, "Zoe Hart", "1985-01-02");

    const { importantDates } = await listFeed(cookie);

    expect(importantDates).toEqual([
      {
        id: expect.any(String),
        contactId: contact.id,
        name: "Birthday",
        fallsOn: "1985-01-02",
        source: "birthday",
        contactName: "Zoe Hart",
        createdAt: expect.any(String),
      },
    ]);
  });

  it("needs a session", async () => {
    expect((await api("GET", "/api/important-dates")).status).toBe(401);
  });
});
