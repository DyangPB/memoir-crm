import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
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

async function createKey(cookie: string, name: string): Promise<{ id: string; secret: string }> {
  const response = await api("POST", "/api/mcp-keys", { name }, cookie);
  const body = (await response.json()) as { key: { id: string }; secret: string };

  return { id: body.key.id, secret: body.secret };
}

function initialize(authorization?: string): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(authorization !== undefined ? { authorization } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
  });
}

describe("/mcp authentication", () => {
  it("turns away a client with no key, a malformed key, or a key nobody issued", async () => {
    expect((await initialize()).status).toBe(401);
    expect((await initialize("Bearer")).status).toBe(401);
    expect((await initialize("Bearer mem_not-a-real-key")).status).toBe(401);
    expect((await initialize("Basic abc")).status).toBe(401);
  });

  it("lets a client with a live key in", async () => {
    const cookie = await signInAs("mcp-auth@example.com");
    const { secret } = await createKey(cookie, "Test client");

    expect((await initialize(`Bearer ${secret}`)).status).toBe(200);
  });
});

type ToolResult = { content: { type: string; text?: string }[]; isError?: boolean };

type Answer = { action: "accept"; content: { confirm: boolean } } | { action: "decline" };

/**
 * An assistant that can be asked to confirm: it speaks the newer protocol and
 * answers every prompt with `answer`, recording what it was asked.
 */
async function connect(secret: string, asks?: { answer: Answer; questions: string[] }): Promise<Client> {
  const client =
    asks === undefined
      ? new Client({ name: "test-assistant", version: "1.0.0" })
      : new Client(
          { name: "test-assistant", version: "1.0.0" },
          { capabilities: { elicitation: { form: {} } }, versionNegotiation: { mode: "auto" } },
        );

  if (asks !== undefined) {
    client.setRequestHandler("elicitation/create", async (request) => {
      asks.questions.push(request.params.message);

      return asks.answer;
    });
  }

  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), {
      fetch: (input, init) => exports.default.fetch(new Request(input, init)),
      requestInit: { headers: { authorization: `Bearer ${secret}` } },
    }),
  );

  return client;
}

async function callTool(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as ToolResult;
  const text = result.content.map((block) => block.text ?? "").join("");

  return { isError: result.isError === true, text, json: () => JSON.parse(text) as unknown };
}

async function addContact(cookie: string, name: string, extra: Record<string, unknown> = {}) {
  const response = await api("POST", "/api/contacts", { name, ...extra }, cookie);

  expect(response.status).toBe(201);

  return ((await response.json()) as { contact: { id: string; name: string } }).contact;
}

describe("/mcp contacts", () => {
  it("lists and searches only the key owner's contacts", async () => {
    const owner = await signInAs("mcp-list-owner@example.com");
    const stranger = await signInAs("mcp-list-stranger@example.com");

    await addContact(owner, "Ada Lovelace");
    await addContact(owner, "Grace Hopper");
    await addContact(stranger, "Alan Turing");

    const client = await connect((await createKey(owner, "Assistant")).secret);
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toContain("list_contacts");

    const all = (await callTool(client, "list_contacts")).json() as { contacts: { name: string }[] };

    expect(all.contacts.map((contact) => contact.name)).toEqual(["Ada Lovelace", "Grace Hopper"]);

    const found = (await callTool(client, "list_contacts", { query: "hopper" })).json() as {
      contacts: { name: string }[];
    };

    expect(found.contacts.map((contact) => contact.name)).toEqual(["Grace Hopper"]);
  });
});

describe("/mcp reading a contact", () => {
  it("returns the contact with its timeline and notes, and nothing of anyone else's", async () => {
    const owner = await signInAs("mcp-get-owner@example.com");
    const stranger = await signInAs("mcp-get-stranger@example.com");
    const ada = await addContact(owner, "Ada Lovelace");
    const alan = await addContact(stranger, "Alan Turing");

    await api(
      "POST",
      `/api/contacts/${ada.id}/interactions`,
      { type: "meeting", occurredOn: "2026-10-01", note: "Coffee at the salon" },
      owner,
    );
    await api("POST", `/api/contacts/${ada.id}/notes`, { body: "Loves analytical engines" }, owner);

    const client = await connect((await createKey(owner, "Assistant")).secret);
    const got = await callTool(client, "get_contact", { contactId: ada.id });
    const detail = got.json() as {
      contact: { name: string };
      interactions: { type: string; note: string }[];
      notes: { body: string }[];
    };

    expect(got.isError).toBe(false);
    expect(detail.contact.name).toBe("Ada Lovelace");
    expect(detail.interactions.map((entry) => entry.note)).toEqual(["Coffee at the salon"]);
    expect(detail.notes.map((note) => note.body)).toEqual(["Loves analytical engines"]);

    const foreign = await callTool(client, "get_contact", { contactId: alan.id });

    expect(foreign.isError).toBe(true);
    expect(foreign.text).not.toContain("Alan Turing");
  });
});

describe("/mcp writing for the key owner", () => {
  it("logs an Interaction that shows up on the contact's Timeline", async () => {
    const owner = await signInAs("mcp-log-owner@example.com");
    const bob = await addContact(owner, "Bob Brown");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    const logged = await callTool(client, "log_interaction", {
      contactId: bob.id,
      type: "meeting",
      occurredOn: "2026-10-15",
      note: "Coffee with Bob",
    });

    expect(logged.isError).toBe(false);

    const timeline = await api("GET", `/api/contacts/${bob.id}/interactions`, undefined, owner);
    const { interactions } = (await timeline.json()) as {
      interactions: { type: string; occurredOn: string; note: string }[];
    };

    expect(interactions).toEqual([
      expect.objectContaining({ type: "meeting", occurredOn: "2026-10-15", note: "Coffee with Bob" }),
    ]);

    const invalid = await callTool(client, "log_interaction", {
      contactId: bob.id,
      type: "carrier-pigeon",
      occurredOn: "2026-10-15",
    });

    expect(invalid.isError).toBe(true);
  });

  it("adds a Note to a contact", async () => {
    const owner = await signInAs("mcp-note-owner@example.com");
    const bob = await addContact(owner, "Bob Brown");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    const added = await callTool(client, "add_note", {
      contactId: bob.id,
      body: "Prefers tea to coffee",
    });

    expect(added.isError).toBe(false);

    const response = await api("GET", `/api/contacts/${bob.id}/notes`, undefined, owner);
    const { notes } = (await response.json()) as { notes: { body: string }[] };

    expect(notes.map((note) => note.body)).toEqual(["Prefers tea to coffee"]);
    expect((await callTool(client, "add_note", { contactId: bob.id, body: "  " })).isError).toBe(
      true,
    );
  });

  it("adds a Reminder that is due on the day asked", async () => {
    const owner = await signInAs("mcp-reminder-owner@example.com");
    const bob = await addContact(owner, "Bob Brown");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    const added = await callTool(client, "add_reminder", {
      contactId: bob.id,
      body: "Call Bob",
      dueOn: "2099-10-20",
    });

    expect(added.isError).toBe(false);

    const response = await api("GET", `/api/contacts/${bob.id}/reminders`, undefined, owner);
    const { reminders } = (await response.json()) as {
      reminders: { body: string; dueOn: string; status: string }[];
    };

    expect(reminders).toEqual([
      expect.objectContaining({ body: "Call Bob", dueOn: "2099-10-20", status: "pending" }),
    ]);
    expect(
      (await callTool(client, "add_reminder", { contactId: bob.id, body: "Call", dueOn: "soon" }))
        .isError,
    ).toBe(true);
  });
});

describe("/mcp updating a contact", () => {
  it("changes only the fields given and leaves the rest of the contact alone", async () => {
    const owner = await signInAs("mcp-update-owner@example.com");
    const stranger = await signInAs("mcp-update-stranger@example.com");
    const ada = await addContact(owner, "Ada Lovelace", {
      emails: ["ada@example.com"],
      howWeMet: "Salon",
    });
    const alan = await addContact(stranger, "Alan Turing");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    const updated = await callTool(client, "update_contact", {
      contactId: ada.id,
      location: "London",
    });

    expect(updated.isError).toBe(false);

    const response = await api("GET", `/api/contacts/${ada.id}`, undefined, owner);
    const { contact } = (await response.json()) as {
      contact: { name: string; emails: string[]; howWeMet: string; location: string };
    };

    expect(contact).toEqual(
      expect.objectContaining({
        name: "Ada Lovelace",
        emails: ["ada@example.com"],
        howWeMet: "Salon",
        location: "London",
      }),
    );

    const foreign = await callTool(client, "update_contact", {
      contactId: alan.id,
      location: "Nowhere",
    });

    expect(foreign.isError).toBe(true);
  });
});

describe("/mcp deleting a contact", () => {
  async function contactNames(cookie: string): Promise<string[]> {
    const response = await api("GET", "/api/contacts", undefined, cookie);

    return ((await response.json()) as { contacts: { name: string }[] }).contacts.map(
      (contact) => contact.name,
    );
  }

  it("deletes only after the user says yes when asked", async () => {
    const owner = await signInAs("mcp-delete-yes@example.com");
    const ada = await addContact(owner, "Ada Lovelace");
    const asks = { answer: { action: "accept", content: { confirm: true } } as Answer, questions: [] as string[] };
    const client = await connect((await createKey(owner, "Assistant")).secret, asks);

    const deleted = await callTool(client, "delete_contact", { contactId: ada.id });

    expect(deleted.isError).toBe(false);
    expect(asks.questions).toHaveLength(1);
    expect(asks.questions[0]).toContain("Ada Lovelace");
    expect(await contactNames(owner)).toEqual([]);
  });

  it("keeps the contact when the user declines or ticks no", async () => {
    const owner = await signInAs("mcp-delete-no@example.com");
    const ada = await addContact(owner, "Ada Lovelace");
    const secret = (await createKey(owner, "Assistant")).secret;

    for (const answer of [
      { action: "decline" } as Answer,
      { action: "accept", content: { confirm: false } } as Answer,
    ]) {
      const client = await connect(secret, { answer, questions: [] });
      const result = await callTool(client, "delete_contact", { contactId: ada.id });

      expect(result.text).toMatch(/not deleted/i);
    }

    expect(await contactNames(owner)).toEqual(["Ada Lovelace"]);
  });

  it("refuses, and keeps the contact, when the assistant cannot be asked", async () => {
    const owner = await signInAs("mcp-delete-unasked@example.com");
    const ada = await addContact(owner, "Ada Lovelace");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    const result = await callTool(client, "delete_contact", { contactId: ada.id });

    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/confirm/i);
    expect(await contactNames(owner)).toEqual(["Ada Lovelace"]);
  });
});

describe("/mcp deleting what is logged on a contact", () => {
  const kinds = [
    { tool: "delete_interaction", idArg: "interactionId", list: "interactions", make: "interactions", made: "interaction", body: { type: "call", occurredOn: "2026-10-01", note: "Quick call" } },
    { tool: "delete_note", idArg: "noteId", list: "notes", make: "notes", made: "note", body: { body: "Likes tea" } },
    { tool: "delete_reminder", idArg: "reminderId", list: "reminders", make: "reminders", made: "reminder", body: { body: "Call Bob", dueOn: "2099-10-20" } },
  ] as const;

  for (const kind of kinds) {
    it(`${kind.tool} asks first, and deletes only on yes`, async () => {
      const owner = await signInAs(`mcp-${kind.tool}@example.com`);
      const bob = await addContact(owner, "Bob Brown");
      const created = await api("POST", `/api/contacts/${bob.id}/${kind.make}`, kind.body, owner);
      const itemId = ((await created.json()) as Record<string, { id: string }>)[kind.made]?.id;
      const secret = (await createKey(owner, "Assistant")).secret;
      const remaining = async () => {
        const response = await api("GET", `/api/contacts/${bob.id}/${kind.list}`, undefined, owner);

        return ((await response.json()) as Record<string, unknown[]>)[kind.list]?.length;
      };
      const args = { contactId: bob.id, [kind.idArg]: itemId };

      const declined = await connect(secret, { answer: { action: "decline" }, questions: [] });

      expect((await callTool(declined, kind.tool, args)).text).toMatch(/not deleted/i);
      expect(await remaining()).toBe(1);

      const unasked = await connect(secret);

      expect((await callTool(unasked, kind.tool, args)).isError).toBe(true);
      expect(await remaining()).toBe(1);

      const questions: string[] = [];
      const accepted = await connect(secret, {
        answer: { action: "accept", content: { confirm: true } },
        questions,
      });

      expect((await callTool(accepted, kind.tool, args)).isError).toBe(false);
      expect(questions).toHaveLength(1);
      expect(await remaining()).toBe(0);
    });
  }
});

describe("/mcp ids and keys stay in their lane", () => {
  it("does not let an id escape its place in the path", async () => {
    const owner = await signInAs("mcp-dots@example.com");
    const bob = await addContact(owner, "Bob Brown");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    for (const contactId of [".", "..", "../contacts", `${bob.id}/notes`]) {
      for (const [tool, extra] of [
        ["get_contact", {}],
        ["add_note", { body: "x" }],
        ["log_interaction", { type: "call", occurredOn: "2026-10-01" }],
        ["add_reminder", { body: "x", dueOn: "2099-01-01" }],
        ["update_contact", { location: "x" }],
        ["delete_contact", {}],
      ] as const) {
        const result = await callTool(client, tool, { contactId, ...extra });

        expect(result.isError, `${tool} ${contactId}`).toBe(true);
        expect(result.text).not.toContain("Bob Brown");
      }
    }
  });

  it("is not a way into the web app's own API", async () => {
    const owner = await signInAs("mcp-no-api@example.com");
    const { secret } = await createKey(owner, "Assistant");

    for (const path of ["/api/contacts", "/api/mcp-keys", "/api/settings"]) {
      const response = await exports.default.fetch(`${ORIGIN}${path}`, {
        headers: { authorization: `Bearer ${secret}` },
      });

      expect(response.status, path).toBe(401);
    }
  });
});

describe("/mcp revoked keys", () => {
  it("stops working the moment the key is revoked, even for a connected client", async () => {
    const owner = await signInAs("mcp-revoke-owner@example.com");
    const { id, secret } = await createKey(owner, "Assistant");
    const client = await connect(secret);

    expect((await callTool(client, "list_contacts")).isError).toBe(false);

    expect((await api("DELETE", `/api/mcp-keys/${id}`, undefined, owner)).status).toBe(204);

    await expect(callTool(client, "list_contacts")).rejects.toThrow();
    await expect(connect(secret)).rejects.toThrow();
    expect((await initialize(`Bearer ${secret}`)).status).toBe(401);
  });
});

describe("/mcp managing contacts", () => {
  it("creates a contact with the details given", async () => {
    const owner = await signInAs("mcp-create-owner@example.com");
    const client = await connect((await createKey(owner, "Assistant")).secret);

    const created = await callTool(client, "create_contact", {
      name: "Grace Hopper",
      emails: ["grace@example.com"],
      birthday: "1906-12-09",
      howWeMet: "Compiler conference",
    });

    expect(created.isError).toBe(false);

    const response = await api("GET", "/api/contacts", undefined, owner);
    const { contacts } = (await response.json()) as {
      contacts: { name: string; emails: string[]; birthday: string; howWeMet: string }[];
    };

    expect(contacts).toEqual([
      expect.objectContaining({
        name: "Grace Hopper",
        emails: ["grace@example.com"],
        birthday: "1906-12-09",
        howWeMet: "Compiler conference",
      }),
    ]);
    expect((await callTool(client, "create_contact", { name: "" })).isError).toBe(true);
  });
});