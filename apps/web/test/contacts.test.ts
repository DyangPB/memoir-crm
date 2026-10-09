import type { Contact } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";

const FULL_CONTACT = {
  name: "  Bob Nguyen  ",
  emails: ["bob@example.com", "bob.work@example.com"],
  phones: ["+1 555 0100"],
  socialLinks: [{ label: "Instagram", url: "instagram.com/bob" }],
  birthday: "1990-05-14",
  howWeMet: "Neighbours in Lisbon",
};

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

async function createBob(cookie: string): Promise<Contact> {
  const response = await api("POST", "/api/contacts", FULL_CONTACT, cookie);

  expect(response.status).toBe(201);
  const body = (await response.json()) as { contact: Contact };

  return body.contact;
}

describe("POST /api/contacts", () => {
  it("creates a contact with every built-in field", async () => {
    const cookie = await signInAs("owner@example.com");
    const contact = await createBob(cookie);

    expect(contact.name).toBe("Bob Nguyen");
    expect(contact.emails).toEqual(["bob@example.com", "bob.work@example.com"]);
    expect(contact.phones).toEqual(["+1 555 0100"]);
    expect(contact.socialLinks).toEqual([{ label: "Instagram", url: "https://instagram.com/bob" }]);
    expect(contact.birthday).toBe("1990-05-14");
    expect(contact.howWeMet).toBe("Neighbours in Lisbon");
    expect(contact.lastInteractionAt).toBeNull();

    const owner = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind("owner@example.com")
      .first<{ id: string }>();
    const row = await env.DB.prepare(
      "SELECT name, birthday, user_id FROM contacts WHERE id = ?",
    )
      .bind(contact.id)
      .first<{ name: string; birthday: string; user_id: string }>();

    expect(row).toEqual({ name: "Bob Nguyen", birthday: "1990-05-14", user_id: owner?.id });
  });

  it("rejects a contact without a name", async () => {
    const cookie = await signInAs("nameless@example.com");
    const response = await api("POST", "/api/contacts", { emails: ["x@example.com"] }, cookie);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Add a name for this contact." });
  });

  it("turns away requests without a session", async () => {
    const response = await api("POST", "/api/contacts", FULL_CONTACT);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/contacts", () => {
  it("lists only the signed-in user's contacts", async () => {
    const alice = await signInAs("alice@example.com");
    const bob = await signInAs("bob@example.com");

    await createBob(alice);

    const aliceList = await api("GET", "/api/contacts", undefined, alice);
    const aliceBody = (await aliceList.json()) as { contacts: Contact[] };
    expect(aliceBody.contacts.map((contact) => contact.name)).toEqual(["Bob Nguyen"]);

    const bobList = await api("GET", "/api/contacts", undefined, bob);
    const bobBody = (await bobList.json()) as { contacts: Contact[] };
    expect(bobBody.contacts).toEqual([]);
  });

  it("turns away requests without a session", async () => {
    const response = await api("GET", "/api/contacts");

    expect(response.status).toBe(401);
  });
});

describe("contact ownership", () => {
  it("hides another user's contact from read, update, and delete", async () => {
    const owner = await signInAs("owner-2@example.com");
    const stranger = await signInAs("stranger@example.com");
    const contact = await createBob(owner);

    const read = await api("GET", `/api/contacts/${contact.id}`, undefined, stranger);
    const update = await api("PUT", `/api/contacts/${contact.id}`, FULL_CONTACT, stranger);
    const remove = await api("DELETE", `/api/contacts/${contact.id}`, undefined, stranger);

    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);

    const stillThere = await api("GET", `/api/contacts/${contact.id}`, undefined, owner);
    expect(stillThere.status).toBe(200);
  });
});

describe("PUT /api/contacts/:id", () => {
  it("updates the contact's details", async () => {
    const cookie = await signInAs("editor@example.com");
    const contact = await createBob(cookie);

    const response = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { ...FULL_CONTACT, name: "Robert Nguyen", birthday: "1991-01-02", howWeMet: "College" },
      cookie,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { contact: Contact };
    expect(body.contact.name).toBe("Robert Nguyen");
    expect(body.contact.birthday).toBe("1991-01-02");

    const row = await env.DB.prepare("SELECT name, how_we_met FROM contacts WHERE id = ?")
      .bind(contact.id)
      .first<{ name: string; how_we_met: string }>();
    expect(row).toEqual({ name: "Robert Nguyen", how_we_met: "College" });
  });
});

describe("DELETE /api/contacts/:id", () => {
  it("removes the contact", async () => {
    const cookie = await signInAs("remover@example.com");
    const contact = await createBob(cookie);

    const response = await api("DELETE", `/api/contacts/${contact.id}`, undefined, cookie);
    expect(response.status).toBe(204);

    const gone = await env.DB.prepare("SELECT COUNT(*) AS count FROM contacts WHERE id = ?")
      .bind(contact.id)
      .first<{ count: number }>();
    expect(gone?.count).toBe(0);

    const again = await api("DELETE", `/api/contacts/${contact.id}`, undefined, cookie);
    expect(again.status).toBe(404);
  });
});
