import type { Contact, Interaction, Note } from "@memoir/core";
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

describe("logging interactions", () => {
  it("logs an interaction and shows it in the thread", async () => {
    const cookie = await signInAs("logger@example.com");
    const contact = await createContact(cookie, "Bob Nguyen");

    const response = await api(
      "POST",
      `/api/contacts/${contact.id}/interactions`,
      { type: "call", occurredOn: "2026-10-01", note: "Caught up over the phone" },
      cookie,
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { interaction: Interaction };
    expect(body.interaction).toMatchObject({
      contactId: contact.id,
      type: "call",
      occurredOn: "2026-10-01",
      note: "Caught up over the phone",
    });

    const list = await api("GET", `/api/contacts/${contact.id}/interactions`, undefined, cookie);
    const listBody = (await list.json()) as { interactions: Interaction[] };
    expect(listBody.interactions.map((interaction) => interaction.id)).toEqual([
      body.interaction.id,
    ]);
  });

  it("keeps the thread newest first", async () => {
    const cookie = await signInAs("ordered@example.com");
    const contact = await createContact(cookie, "Ines Okafor");
    const path = `/api/contacts/${contact.id}/interactions`;

    await api("POST", path, { type: "call", occurredOn: "2026-09-30" }, cookie);
    await api("POST", path, { type: "meeting", occurredOn: "2026-10-06" }, cookie);
    await api("POST", path, { type: "message", occurredOn: "2026-10-01" }, cookie);

    const list = await api("GET", path, undefined, cookie);
    const body = (await list.json()) as { interactions: Interaction[] };
    expect(body.interactions.map((interaction) => interaction.occurredOn)).toEqual([
      "2026-10-06",
      "2026-10-01",
      "2026-09-30",
    ]);
  });

  it("feeds the most recent interaction into the contact list and detail", async () => {
    const cookie = await signInAs("dayssince@example.com");
    const contact = await createContact(cookie, "Kofi Mensah");
    const path = `/api/contacts/${contact.id}/interactions`;

    await api("POST", path, { type: "call", occurredOn: "2026-10-01" }, cookie);
    await api("POST", path, { type: "call", occurredOn: "2026-10-06" }, cookie);

    const list = await api("GET", "/api/contacts", undefined, cookie);
    const listBody = (await list.json()) as { contacts: Contact[] };
    expect(listBody.contacts[0]?.lastInteractionAt).toBe("2026-10-06");

    const detail = await api("GET", `/api/contacts/${contact.id}`, undefined, cookie);
    const detailBody = (await detail.json()) as { contact: Contact };
    expect(detailBody.contact.lastInteractionAt).toBe("2026-10-06");
  });

  it("edits and deletes an interaction", async () => {
    const cookie = await signInAs("editor-interaction@example.com");
    const contact = await createContact(cookie, "Lena Fischer");
    const created = await api(
      "POST",
      `/api/contacts/${contact.id}/interactions`,
      { type: "call", occurredOn: "2026-10-01", note: "Wrong note" },
      cookie,
    );
    const createdBody = (await created.json()) as { interaction: Interaction };
    const path = `/api/contacts/${contact.id}/interactions/${createdBody.interaction.id}`;

    const update = await api(
      "PUT",
      path,
      { type: "meeting", occurredOn: "2026-10-02", note: "Coffee in the park" },
      cookie,
    );
    expect(update.status).toBe(200);
    const updateBody = (await update.json()) as { interaction: Interaction };
    expect(updateBody.interaction).toMatchObject({
      type: "meeting",
      occurredOn: "2026-10-02",
      note: "Coffee in the park",
    });

    const remove = await api("DELETE", path, undefined, cookie);
    expect(remove.status).toBe(204);

    const again = await api("DELETE", path, undefined, cookie);
    expect(again.status).toBe(404);

    const list = await api("GET", `/api/contacts/${contact.id}/interactions`, undefined, cookie);
    const listBody = (await list.json()) as { interactions: Interaction[] };
    expect(listBody.interactions).toEqual([]);
  });

  it("rejects an unknown type or an impossible date", async () => {
    const cookie = await signInAs("validator@example.com");
    const contact = await createContact(cookie, "Marco Silva");
    const path = `/api/contacts/${contact.id}/interactions`;

    const badType = await api("POST", path, { type: "email", occurredOn: "2026-10-01" }, cookie);
    expect(badType.status).toBe(400);

    const badDate = await api("POST", path, { type: "call", occurredOn: "2026-02-31" }, cookie);
    expect(badDate.status).toBe(400);
  });

  it("removes the thread when the contact is deleted", async () => {
    const cookie = await signInAs("cascade@example.com");
    const contact = await createContact(cookie, "Ada Lovelace");

    await api(
      "POST",
      `/api/contacts/${contact.id}/interactions`,
      { type: "message", occurredOn: "2026-10-01" },
      cookie,
    );
    await api("DELETE", `/api/contacts/${contact.id}`, undefined, cookie);

    const rows = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM interactions WHERE contact_id = ?",
    )
      .bind(contact.id)
      .first<{ count: number }>();
    expect(rows?.count).toBe(0);
  });
});

describe("interaction privacy", () => {
  it("hides another user's thread from every verb", async () => {
    const owner = await signInAs("owner-interactions@example.com");
    const stranger = await signInAs("stranger-interactions@example.com");
    const contact = await createContact(owner, "Bob Nguyen");
    const created = await api(
      "POST",
      `/api/contacts/${contact.id}/interactions`,
      { type: "call", occurredOn: "2026-10-01" },
      owner,
    );
    const createdBody = (await created.json()) as { interaction: Interaction };
    const path = `/api/contacts/${contact.id}/interactions`;

    const read = await api("GET", path, undefined, stranger);
    const write = await api("POST", path, { type: "call", occurredOn: "2026-10-02" }, stranger);
    const edit = await api(
      "PUT",
      `${path}/${createdBody.interaction.id}`,
      { type: "meeting", occurredOn: "2026-10-02" },
      stranger,
    );
    const remove = await api("DELETE", `${path}/${createdBody.interaction.id}`, undefined, stranger);

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);

    const stillThere = await api("GET", path, undefined, owner);
    const body = (await stillThere.json()) as { interactions: Interaction[] };
    expect(body.interactions).toHaveLength(1);
  });
});

describe("notes", () => {
  it("adds, edits, and deletes notes", async () => {
    const cookie = await signInAs("notekeeper@example.com");
    const contact = await createContact(cookie, "Dana Reyes");
    const path = `/api/contacts/${contact.id}/notes`;

    const created = await api("POST", path, { body: "  Gift ideas: a good notebook  " }, cookie);
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { note: Note };
    expect(createdBody.note.body).toBe("Gift ideas: a good notebook");

    const update = await api(
      "PUT",
      `${path}/${createdBody.note.id}`,
      { body: "Gift ideas: a fountain pen" },
      cookie,
    );
    expect(update.status).toBe(200);

    const list = await api("GET", path, undefined, cookie);
    const listBody = (await list.json()) as { notes: Note[] };
    expect(listBody.notes.map((note) => note.body)).toEqual(["Gift ideas: a fountain pen"]);

    const remove = await api("DELETE", `${path}/${createdBody.note.id}`, undefined, cookie);
    expect(remove.status).toBe(204);

    const empty = await api("POST", path, { body: "   " }, cookie);
    expect(empty.status).toBe(400);
  });

  it("hides another user's notes", async () => {
    const owner = await signInAs("owner-notes@example.com");
    const stranger = await signInAs("stranger-notes@example.com");
    const contact = await createContact(owner, "Ines Okafor");
    const created = await api("POST", `/api/contacts/${contact.id}/notes`, { body: "Private" }, owner);
    const createdBody = (await created.json()) as { note: Note };
    const path = `/api/contacts/${contact.id}/notes`;

    const read = await api("GET", path, undefined, stranger);
    const write = await api("POST", path, { body: "Intrusion" }, stranger);
    const edit = await api("PUT", `${path}/${createdBody.note.id}`, { body: "Edited" }, stranger);
    const remove = await api("DELETE", `${path}/${createdBody.note.id}`, undefined, stranger);

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});
