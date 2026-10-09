import type { Contact } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";

type LabelPayload = { id: string; name: string; contactCount: number };

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

async function createLabel(cookie: string, name: string): Promise<LabelPayload> {
  const response = await api("POST", "/api/labels", { name }, cookie);

  expect(response.status).toBe(201);
  const body = (await response.json()) as { label: LabelPayload };

  return body.label;
}

async function listContacts(cookie: string, query = ""): Promise<Contact[]> {
  const response = await api("GET", `/api/contacts${query}`, undefined, cookie);
  const body = (await response.json()) as { contacts: Contact[] };

  return body.contacts;
}

describe("labels", () => {
  it("creates, renames, and deletes labels", async () => {
    const cookie = await signInAs("labels-crud@example.com");
    const created = await createLabel(cookie, "  college friends  ");

    expect(created.name).toBe("college friends");
    expect(created.contactCount).toBe(0);

    const rename = await api("PUT", `/api/labels/${created.id}`, { name: "uni friends" }, cookie);
    expect(rename.status).toBe(200);
    const renamed = (await rename.json()) as { label: LabelPayload };
    expect(renamed.label.name).toBe("uni friends");

    const list = await api("GET", "/api/labels", undefined, cookie);
    const listBody = (await list.json()) as { labels: LabelPayload[] };
    expect(listBody.labels.map((label) => label.name)).toContain("uni friends");

    const remove = await api("DELETE", `/api/labels/${created.id}`, undefined, cookie);
    expect(remove.status).toBe(204);

    const after = await api("GET", "/api/labels", undefined, cookie);
    const afterBody = (await after.json()) as { labels: LabelPayload[] };
    expect(afterBody.labels.map((label) => label.id)).not.toContain(created.id);
  });

  it("rejects duplicates and empty names", async () => {
    const cookie = await signInAs("labels-dupes@example.com");
    await createLabel(cookie, "work");

    const duplicate = await api("POST", "/api/labels", { name: "Work" }, cookie);
    expect(duplicate.status).toBe(409);

    const empty = await api("POST", "/api/labels", { name: "   " }, cookie);
    expect(empty.status).toBe(400);
  });

  it("applies multiple labels to one contact", async () => {
    const cookie = await signInAs("labels-apply@example.com");
    const family = await createLabel(cookie, "family");
    const neighbours = await createLabel(cookie, "neighbours");
    const contact = await createContact(cookie, "Bob Nguyen");

    const apply = await api(
      "PUT",
      `/api/contacts/${contact.id}/labels`,
      { labelIds: [family.id, neighbours.id] },
      cookie,
    );
    expect(apply.status).toBe(200);
    const applied = (await apply.json()) as { contact: Contact };
    expect(applied.contact.labels.map((label) => label.name)).toEqual(["family", "neighbours"]);

    const list = await listContacts(cookie);
    const listed = list.find((item) => item.id === contact.id);
    expect(listed?.labels).toHaveLength(2);

    const detail = await api("GET", `/api/contacts/${contact.id}`, undefined, cookie);
    const detailBody = (await detail.json()) as { contact: Contact };
    expect(detailBody.contact.labels).toHaveLength(2);

    const reduce = await api(
      "PUT",
      `/api/contacts/${contact.id}/labels`,
      { labelIds: [family.id] },
      cookie,
    );
    const reduced = (await reduce.json()) as { contact: Contact };
    expect(reduced.contact.labels.map((label) => label.name)).toEqual(["family"]);

    const counts = await api("GET", "/api/labels", undefined, cookie);
    const countsBody = (await counts.json()) as { labels: LabelPayload[] };
    expect(countsBody.labels.find((label) => label.id === family.id)?.contactCount).toBe(1);
    expect(countsBody.labels.find((label) => label.id === neighbours.id)?.contactCount).toBe(0);
  });

  it("refuses labels that belong to someone else", async () => {
    const owner = await signInAs("labels-owner@example.com");
    const stranger = await signInAs("labels-stranger@example.com");
    const foreign = await createLabel(owner, "owner only");
    const contact = await createContact(stranger, "Ines Okafor");

    const apply = await api(
      "PUT",
      `/api/contacts/${contact.id}/labels`,
      { labelIds: [foreign.id] },
      stranger,
    );
    expect(apply.status).toBe(400);

    const remove = await api("DELETE", `/api/labels/${foreign.id}`, undefined, stranger);
    expect(remove.status).toBe(404);

    const rename = await api("PUT", `/api/labels/${foreign.id}`, { name: "stolen" }, stranger);
    expect(rename.status).toBe(404);
  });

  it("filters the home list by label through the query string", async () => {
    const cookie = await signInAs("labels-filter@example.com");
    const work = await createLabel(cookie, "work");
    const bob = await createContact(cookie, "Bob Nguyen");
    await createContact(cookie, "Ada Lovelace");

    await api("PUT", `/api/contacts/${bob.id}/labels`, { labelIds: [work.id] }, cookie);

    const filtered = await listContacts(cookie, `?label=${work.id}`);
    expect(filtered.map((contact) => contact.name)).toEqual(["Bob Nguyen"]);

    const other = await signInAs("labels-filter-other@example.com");
    const otherLabel = await createLabel(other, "theirs");
    const foreignFilter = await listContacts(cookie, `?label=${otherLabel.id}`);
    expect(foreignFilter).toEqual([]);
  });
});

describe("search", () => {
  it("matches names, note text, and interaction text", async () => {
    const cookie = await signInAs("search-basic@example.com");
    const bob = await createContact(cookie, "Bob Nguyen");
    await api("POST", `/api/contacts/${bob.id}/notes`, { body: "Loves birdwatching" }, cookie);
    await api(
      "POST",
      `/api/contacts/${bob.id}/interactions`,
      { type: "call", occurredOn: "2026-10-01", note: "Talked about the marathon" },
      cookie,
    );

    expect((await listContacts(cookie, "?q=Nguy")).map((contact) => contact.name)).toEqual([
      "Bob Nguyen",
    ]);
    expect((await listContacts(cookie, "?q=birdwat")).map((contact) => contact.name)).toEqual([
      "Bob Nguyen",
    ]);
    expect((await listContacts(cookie, "?q=marathon")).map((contact) => contact.name)).toEqual([
      "Bob Nguyen",
    ]);
    expect(await listContacts(cookie, "?q=zebra")).toEqual([]);
  });

  it("combines search with the label filter", async () => {
    const cookie = await signInAs("search-labels@example.com");
    const work = await createLabel(cookie, "work");
    await createContact(cookie, "Bob Nguyen");
    const robert = await createContact(cookie, "Robert Nguyen");
    await api("PUT", `/api/contacts/${robert.id}/labels`, { labelIds: [work.id] }, cookie);

    expect((await listContacts(cookie, "?q=Nguyen")).map((contact) => contact.name)).toEqual([
      "Bob Nguyen",
      "Robert Nguyen",
    ]);
    expect(
      (await listContacts(cookie, `?q=Nguyen&label=${work.id}`)).map((contact) => contact.name),
    ).toEqual(["Robert Nguyen"]);
  });

  it("survives punctuation in the query", async () => {
    const cookie = await signInAs("search-punctuation@example.com");
    await createContact(cookie, "Bob Nguyen");

    const response = await api("GET", "/api/contacts?q=%22say%20%22hi", undefined, cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ contacts: [] });
  });

  it("re-indexes when notes and interactions change", async () => {
    const cookie = await signInAs("search-sync@example.com");
    const contact = await createContact(cookie, "Sofia Marchetti");

    const note = await api(
      "POST",
      `/api/contacts/${contact.id}/notes`,
      { body: "Saxophone lessons on Tuesdays" },
      cookie,
    );
    const noteBody = (await note.json()) as { note: { id: string } };
    expect(await listContacts(cookie, "?q=saxophone")).toHaveLength(1);

    await api(
      "PUT",
      `/api/contacts/${contact.id}/notes/${noteBody.note.id}`,
      { body: "Piano lessons on Fridays" },
      cookie,
    );
    expect(await listContacts(cookie, "?q=saxophone")).toEqual([]);
    expect(await listContacts(cookie, "?q=piano")).toHaveLength(1);

    await api("DELETE", `/api/contacts/${contact.id}/notes/${noteBody.note.id}`, undefined, cookie);
    expect(await listContacts(cookie, "?q=piano")).toEqual([]);

    const interaction = await api(
      "POST",
      `/api/contacts/${contact.id}/interactions`,
      { type: "meeting", occurredOn: "2026-10-01", note: "Marathon training plans" },
      cookie,
    );
    const interactionBody = (await interaction.json()) as { interaction: { id: string } };
    expect(await listContacts(cookie, "?q=marathon")).toHaveLength(1);

    await api(
      "PUT",
      `/api/contacts/${contact.id}/interactions/${interactionBody.interaction.id}`,
      { type: "meeting", occurredOn: "2026-10-01", note: "Bouldering session" },
      cookie,
    );
    expect(await listContacts(cookie, "?q=marathon")).toEqual([]);
    expect(await listContacts(cookie, "?q=bouldering")).toHaveLength(1);

    await api(
      "DELETE",
      `/api/contacts/${contact.id}/interactions/${interactionBody.interaction.id}`,
      undefined,
      cookie,
    );
    expect(await listContacts(cookie, "?q=bouldering")).toEqual([]);
  });

  it("re-indexes when a contact is renamed", async () => {
    const cookie = await signInAs("search-rename@example.com");
    const contact = await createContact(cookie, "Bob Nguyen");

    await api("PUT", `/api/contacts/${contact.id}`, { name: "Robert Nguyen" }, cookie);

    expect(await listContacts(cookie, "?q=robert")).toHaveLength(1);
    expect(await listContacts(cookie, "?q=bob")).toEqual([]);
  });

  it("keeps other users out of search and label filters", async () => {
    const owner = await signInAs("search-privacy-owner@example.com");
    const stranger = await signInAs("search-privacy-stranger@example.com");
    const contact = await createContact(owner, "Zebra Keeper");
    const label = await createLabel(owner, "zebrafolk");
    await api("PUT", `/api/contacts/${contact.id}/labels`, { labelIds: [label.id] }, owner);

    expect(await listContacts(stranger, "?q=zebra")).toEqual([]);
    expect(await listContacts(stranger, `?label=${label.id}`)).toEqual([]);
  });

  it("drops removed contacts from the index", async () => {
    const cookie = await signInAs("search-delete@example.com");
    const contact = await createContact(cookie, "Zebra Keeper");

    expect(await listContacts(cookie, "?q=zebra")).toHaveLength(1);

    await api("DELETE", `/api/contacts/${contact.id}`, undefined, cookie);

    expect(await listContacts(cookie, "?q=zebra")).toEqual([]);

    const rows = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM contacts_fts WHERE contact_id = ?",
    )
      .bind(contact.id)
      .first<{ count: number }>();
    expect(rows?.count).toBe(0);
  });
});
