import type { Contact, FieldDefinitionSummary } from "@memoir/core";
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

async function createField(cookie: string, body: unknown): Promise<FieldDefinitionSummary> {
  const response = await api("POST", "/api/fields", body, cookie);

  expect(response.status).toBe(201);
  const payload = (await response.json()) as { field: FieldDefinitionSummary };

  return payload.field;
}

async function createContact(cookie: string, body: unknown): Promise<Contact> {
  const response = await api("POST", "/api/contacts", body, cookie);

  expect(response.status).toBe(201);
  const payload = (await response.json()) as { contact: Contact };

  return payload.contact;
}

describe("field definitions", () => {
  it("defines a field of every type and lists them", async () => {
    const cookie = await signInAs("fields-crud@example.com");
    const inputs = [
      { name: "Notes", type: "text", options: [] },
      { name: "Family size", type: "number", options: [] },
      { name: "Anniversary", type: "date", options: [] },
      { name: "Family", type: "single-select", options: [" Immediate ", "Extended", "Immediate"] },
      { name: "Languages", type: "multi-select", options: ["English", "Portuguese"] },
      { name: "Gift ideas", type: "long-text", options: [] },
      { name: "Met in person", type: "boolean", options: [] },
      { name: "Website", type: "url", options: [] },
    ];

    for (const input of inputs) {
      const created = await createField(cookie, input);

      expect(created.name).toBe(input.name);
      expect(created.type).toBe(input.type);
      expect(created.contactCount).toBe(0);
    }

    const list = await api("GET", "/api/fields", undefined, cookie);
    const listBody = (await list.json()) as { fields: FieldDefinitionSummary[] };

    expect(listBody.fields.map((field) => field.name)).toEqual([
      "Anniversary",
      "Family",
      "Family size",
      "Gift ideas",
      "Languages",
      "Met in person",
      "Notes",
      "Website",
    ]);
    expect(listBody.fields.find((field) => field.name === "Family")?.options).toEqual([
      "Immediate",
      "Extended",
    ]);
    expect(listBody.fields.find((field) => field.name === "Notes")?.options).toEqual([]);

    const rows = await env.DB.prepare(
      "SELECT name, type, options FROM field_definitions WHERE user_id = (SELECT id FROM users WHERE email = ?) ORDER BY name",
    )
      .bind("fields-crud@example.com")
      .all<{ name: string; type: string; options: string }>();
    expect(rows.results).toHaveLength(8);
    expect(rows.results[0]).toEqual({
      name: "Anniversary",
      type: "date",
      options: "[]",
    });
  });

  it("requires options for selects and a type for every field", async () => {
    const cookie = await signInAs("fields-validation@example.com");

    const noOptions = await api(
      "POST",
      "/api/fields",
      { name: "Family", type: "multi-select", options: [] },
      cookie,
    );
    expect(noOptions.status).toBe(400);
    await expect(noOptions.json()).resolves.toEqual({
      error: "Add at least one option for a select field.",
    });

    const noType = await api("POST", "/api/fields", { name: "Family" }, cookie);
    expect(noType.status).toBe(400);
    await expect(noType.json()).resolves.toEqual({ error: "Pick a field type." });

    const nameless = await api("POST", "/api/fields", { name: "   ", type: "text" }, cookie);
    expect(nameless.status).toBe(400);
    await expect(nameless.json()).resolves.toEqual({ error: "Add a name for this field." });
  });

  it("rejects duplicates and renames a field", async () => {
    const cookie = await signInAs("fields-rename@example.com");
    const created = await createField(cookie, {
      name: "Family",
      type: "single-select",
      options: ["Immediate"],
    });
    await createField(cookie, { name: "Friends", type: "text" });

    const duplicate = await api("POST", "/api/fields", { name: "family", type: "text" }, cookie);
    expect(duplicate.status).toBe(409);

    const rename = await api(
      "PUT",
      `/api/fields/${created.id}`,
      { name: "Close family", type: created.type, options: ["Immediate", "Chosen"] },
      cookie,
    );
    expect(rename.status).toBe(200);
    const renamed = (await rename.json()) as { field: FieldDefinitionSummary };
    expect(renamed.field).toEqual({
      id: created.id,
      name: "Close family",
      type: "single-select",
      options: ["Immediate", "Chosen"],
      contactCount: 0,
    });

    const typeChange = await api(
      "PUT",
      `/api/fields/${created.id}`,
      { name: "Close family", type: "text", options: [] },
      cookie,
    );
    expect(typeChange.status).toBe(400);
    await expect(typeChange.json()).resolves.toEqual({ error: "That field type can't change." });

    const clash = await api(
      "PUT",
      `/api/fields/${created.id}`,
      { name: "friends", type: created.type, options: ["Immediate"] },
      cookie,
    );
    expect(clash.status).toBe(409);
  });

  it("hides another user's fields from every verb", async () => {
    const owner = await signInAs("fields-owner@example.com");
    const stranger = await signInAs("fields-stranger@example.com");
    const field = await createField(owner, { name: "Family", type: "text" });

    const rename = await api("PUT", `/api/fields/${field.id}`, { name: "Taken" }, stranger);
    const remove = await api("DELETE", `/api/fields/${field.id}`, undefined, stranger);
    expect(rename.status).toBe(404);
    expect(remove.status).toBe(404);

    const list = await api("GET", "/api/fields", undefined, stranger);
    const listBody = (await list.json()) as { fields: FieldDefinitionSummary[] };
    expect(listBody.fields).toEqual([]);

    const stillThere = await api("GET", "/api/fields", undefined, owner);
    const ownerBody = (await stillThere.json()) as { fields: FieldDefinitionSummary[] };
    expect(ownerBody.fields.map((field2) => field2.name)).toEqual(["Family"]);
  });
});

describe("custom field values", () => {
  it("saves values on a contact and returns them", async () => {
    const cookie = await signInAs("fields-values@example.com");
    const notes = await createField(cookie, { name: "Notes", type: "text" });
    const familySize = await createField(cookie, { name: "Family size", type: "number" });
    const anniversary = await createField(cookie, { name: "Anniversary", type: "date" });
    const family = await createField(cookie, {
      name: "Family",
      type: "single-select",
      options: ["Immediate", "Extended"],
    });
    const languages = await createField(cookie, {
      name: "Languages",
      type: "multi-select",
      options: ["English", "Portuguese"],
    });
    const giftIdeas = await createField(cookie, { name: "Gift ideas", type: "long-text" });
    const metInPerson = await createField(cookie, { name: "Met in person", type: "boolean" });
    const website = await createField(cookie, { name: "Website", type: "url" });

    const contact = await createContact(cookie, {
      name: "Bob Nguyen",
      customFields: {
        [notes.id]: "  Loves sourdough  ",
        [familySize.id]: 4,
        [anniversary.id]: "2019-06-01",
        [family.id]: "Extended",
        [languages.id]: ["English", "Portuguese", "English"],
        [giftIdeas.id]: "A good notebook",
        [metInPerson.id]: false,
        [website.id]: "instagram.com/bob",
      },
    });

    const expected = {
      [notes.id]: "Loves sourdough",
      [familySize.id]: 4,
      [anniversary.id]: "2019-06-01",
      [family.id]: "Extended",
      [languages.id]: ["English", "Portuguese"],
      [giftIdeas.id]: "A good notebook",
      [metInPerson.id]: false,
      [website.id]: "https://instagram.com/bob",
    };

    expect(contact.customFields).toEqual(expected);

    const detail = await api("GET", `/api/contacts/${contact.id}`, undefined, cookie);
    const detailBody = (await detail.json()) as { contact: Contact };
    expect(detailBody.contact.customFields).toEqual(expected);

    const list = await api("GET", "/api/contacts", undefined, cookie);
    const listBody = (await list.json()) as { contacts: Contact[] };
    expect(listBody.contacts[0]?.customFields).toEqual(expected);

    const row = await env.DB.prepare("SELECT custom_fields FROM contacts WHERE id = ?")
      .bind(contact.id)
      .first<{ custom_fields: string }>();
    expect(JSON.parse(row?.custom_fields ?? "{}")).toEqual(expected);

    const plain = await createContact(cookie, { name: "Ada Lovelace" });
    expect(plain.customFields).toEqual({});
  });

  it("replaces values on update and clears them when omitted", async () => {
    const cookie = await signInAs("fields-update@example.com");
    const nickname = await createField(cookie, { name: "Nickname", type: "text" });
    const familySize = await createField(cookie, { name: "Family size", type: "number" });
    const contact = await createContact(cookie, {
      name: "Bob Nguyen",
      customFields: { [nickname.id]: "Bobby", [familySize.id]: 4 },
    });

    const update = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Robert Nguyen", customFields: { [nickname.id]: "Rob", [familySize.id]: 0 } },
      cookie,
    );
    expect(update.status).toBe(200);
    const updated = (await update.json()) as { contact: Contact };
    expect(updated.contact.customFields).toEqual({ [nickname.id]: "Rob", [familySize.id]: 0 });

    const clear = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Robert Nguyen" },
      cookie,
    );
    const cleared = (await clear.json()) as { contact: Contact };
    expect(cleared.contact.customFields).toEqual({});
  });

  it("rejects values that don't match the field type", async () => {
    const cookie = await signInAs("fields-invalid@example.com");
    const familySize = await createField(cookie, { name: "Family size", type: "number" });
    const family = await createField(cookie, {
      name: "Family",
      type: "single-select",
      options: ["Immediate"],
    });
    const anniversary = await createField(cookie, { name: "Anniversary", type: "date" });

    const cases: [string, unknown, string][] = [
      [familySize.id, "four", 'Add a number for "Family size".'],
      [family.id, "Neighbours", 'Pick one of the options for "Family".'],
      [anniversary.id, "01-06-2019", '"Anniversary" needs a date like 1990-05-04.'],
    ];

    for (const [fieldId, value, message] of cases) {
      const response = await api(
        "POST",
        "/api/contacts",
        { name: "Bob Nguyen", customFields: { [fieldId]: value } },
        cookie,
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: message });
    }
  });

  it("refuses fields that belong to someone else", async () => {
    const owner = await signInAs("fields-values-owner@example.com");
    const stranger = await signInAs("fields-values-stranger@example.com");
    const foreign = await createField(owner, { name: "Family", type: "text" });

    const response = await api(
      "POST",
      "/api/contacts",
      { name: "Bob Nguyen", customFields: { [foreign.id]: "Sneaky" } },
      stranger,
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "One of those fields isn't yours.",
    });
  });

  it("counts the contacts that carry a value for each field", async () => {
    const cookie = await signInAs("fields-counts@example.com");
    const nickname = await createField(cookie, { name: "Nickname", type: "text" });
    const familySize = await createField(cookie, { name: "Family size", type: "number" });
    await createContact(cookie, { name: "Bob Nguyen", customFields: { [nickname.id]: "Bobby" } });
    await createContact(cookie, { name: "Ada Lovelace", customFields: { [nickname.id]: "Ada" } });
    await createContact(cookie, { name: "Kofi Mensah", customFields: { [familySize.id]: 3 } });

    const list = await api("GET", "/api/fields", undefined, cookie);
    const body = (await list.json()) as { fields: FieldDefinitionSummary[] };
    expect(body.fields.find((field) => field.id === nickname.id)?.contactCount).toBe(2);
    expect(body.fields.find((field) => field.id === familySize.id)?.contactCount).toBe(1);
  });

  it("removes a field's values from every contact when the definition is deleted", async () => {
    const cookie = await signInAs("fields-delete@example.com");
    const nickname = await createField(cookie, { name: "Nickname", type: "text" });
    const familySize = await createField(cookie, { name: "Family size", type: "number" });
    const bob = await createContact(cookie, {
      name: "Bob Nguyen",
      customFields: { [nickname.id]: "Bobby", [familySize.id]: 4 },
    });
    const ada = await createContact(cookie, {
      name: "Ada Lovelace",
      customFields: { [nickname.id]: "Ada" },
    });

    const remove = await api("DELETE", `/api/fields/${nickname.id}`, undefined, cookie);
    expect(remove.status).toBe(204);

    const detail = await api("GET", `/api/contacts/${bob.id}`, undefined, cookie);
    const detailBody = (await detail.json()) as { contact: Contact };
    expect(detailBody.contact.customFields).toEqual({ [familySize.id]: 4 });

    const adaDetail = await api("GET", `/api/contacts/${ada.id}`, undefined, cookie);
    const adaBody = (await adaDetail.json()) as { contact: Contact };
    expect(adaBody.contact.customFields).toEqual({});

    const row = await env.DB.prepare("SELECT custom_fields FROM contacts WHERE id = ?")
      .bind(bob.id)
      .first<{ custom_fields: string }>();
    expect(JSON.parse(row?.custom_fields ?? "{}")).toEqual({ [familySize.id]: 4 });

    const fields = await api("GET", "/api/fields", undefined, cookie);
    const fieldsBody = (await fields.json()) as { fields: FieldDefinitionSummary[] };
    expect(fieldsBody.fields.map((field) => field.name)).toEqual(["Family size"]);
  });
});
