import { interactionTypes } from "@memoir/core";
import {
  acceptedContent,
  inputRequired,
  type McpServer,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";

import type { ApiCall, ApiResult } from "./api-call";

/**
 * Ids go straight into request paths, so they are limited to the characters
 * our UUIDs use: "." or ".." would otherwise be read as part of the path.
 */
const id = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/, "That isn't a Memoir id.");

type ToolReply = { content: { type: "text"; text: string }[]; isError?: boolean };

function reply(result: ApiResult): ToolReply {
  if (!result.ok) {
    const message =
      typeof result.body === "object" && result.body !== null && "error" in result.body
        ? String((result.body as { error: unknown }).error)
        : "That didn't work.";

    return { content: [{ type: "text", text: message }], isError: true };
  }

  return { content: [{ type: "text", text: JSON.stringify(result.body) }] };
}

/** What the API reads from a Contact when it is saved; the rest is derived. */
const EDITABLE_FIELDS = [
  "name",
  "emails",
  "phones",
  "socialLinks",
  "birthday",
  "howWeMet",
  "location",
  "roleCompany",
  "timezone",
  "cadenceDays",
  "cadenceTracked",
  "customFields",
] as const;

const contactDetails = {
  emails: z.array(z.string()).optional(),
  phones: z.array(z.string()).optional(),
  birthday: z.string().nullable().optional().describe("YYYY-MM-DD, or null to clear"),
  howWeMet: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  roleCompany: z.string().nullable().optional(),
  timezone: z.string().nullable().optional().describe("An IANA zone such as Europe/London"),
};

const confirmation = z.object({ confirm: z.boolean().describe("Tick to go ahead") });

/**
 * Deletes never run on the assistant's say-so: the user is asked, through the
 * client, and only an accepted "yes" lets the tool carry on. Everything else
 * (a "no", a dismissed prompt, a client that cannot be asked) leaves the data
 * as it is.
 */
function askBeforeDeleting(
  ctx: ServerContext,
  question: string,
): "confirmed" | ToolReply | ReturnType<typeof inputRequired> {
  const answers = ctx.mcpReq.inputResponses;

  if (acceptedContent(answers, "confirm", confirmation)?.confirm === true) {
    return "confirmed";
  }

  if (answers !== undefined && "confirm" in answers) {
    return { content: [{ type: "text", text: "Not deleted: you chose not to confirm." }] };
  }

  // Only clients on the newer protocol can be asked from a stateless server.
  if (ctx.mcpReq.envelope === undefined) {
    return {
      content: [
        {
          type: "text",
          text: "Not deleted: this assistant can't ask you to confirm, and Memoir won't delete without asking. Delete it in the Memoir app instead.",
        },
      ],
      isError: true,
    };
  }

  return inputRequired({
    inputRequests: {
      confirm: inputRequired.elicit({ message: question, requestedSchema: confirmation }),
    },
  });
}

type Logged = { id: string } & Record<string, unknown>;

type LoggedKind = {
  tool: string;
  noun: string;
  idArg: string;
  /** Path segment, and the key its list comes back under. */
  collection: "interactions" | "notes" | "reminders";
  summary: (item: Logged) => string;
};

const loggedKinds: LoggedKind[] = [
  {
    tool: "delete_interaction",
    noun: "interaction",
    idArg: "interactionId",
    collection: "interactions",
    summary: (item) => `${String(item.type)} on ${String(item.occurredOn)}`,
  },
  {
    tool: "delete_note",
    noun: "note",
    idArg: "noteId",
    collection: "notes",
    summary: (item) => `"${String(item.body).slice(0, 80)}"`,
  },
  {
    tool: "delete_reminder",
    noun: "reminder",
    idArg: "reminderId",
    collection: "reminders",
    summary: (item) => `"${String(item.body).slice(0, 80)}"`,
  },
];

function registerDeleteLogged(server: McpServer, call: ApiCall, kind: LoggedKind) {
  server.registerTool(
    kind.tool,
    {
      description: `Delete one ${kind.noun} from a Contact. The user is asked to confirm first, and nothing is deleted unless they say yes.`,
      inputSchema: z.object({ contactId: id, [kind.idArg]: id }),
      annotations: { destructiveHint: true },
    },
    async (args: Record<string, string>, ctx) => {
      const contactPath = `/contacts/${encodeURIComponent(args.contactId ?? "")}`;
      const itemId = args[kind.idArg] ?? "";
      const [contact, items] = await Promise.all([
        call("GET", contactPath),
        call("GET", `${contactPath}/${kind.collection}`),
      ]);

      if (!contact.ok || !items.ok) {
        return reply(contact.ok ? items : contact);
      }

      const list = (items.body as Record<string, Logged[]>)[kind.collection] ?? [];
      const item = list.find((entry) => entry.id === itemId);

      if (item === undefined) {
        return reply({ ok: false, status: 404, body: { error: `That ${kind.noun} isn't here.` } });
      }

      const name = (contact.body as { contact: { name: string } }).contact.name;
      const gate = askBeforeDeleting(
        ctx,
        `Delete this ${kind.noun} (${kind.summary(item)}) from ${name}? This can't be undone.`,
      );

      return gate === "confirmed"
        ? reply(await call("DELETE", `${contactPath}/${kind.collection}/${encodeURIComponent(itemId)}`))
        : gate;
    },
  );
}

export function registerTools(server: McpServer, call: ApiCall) {
  server.registerTool(
    "list_contacts",
    {
      description:
        "List the user's Contacts, A to Z, each with days since the last Interaction. Pass `query` to search names, Notes and logged Interactions, or `label` (a Label id) to filter.",
      inputSchema: z.object({
        query: z.string().optional(),
        label: z.string().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query, label }) => {
      const params = new URLSearchParams();

      if (query !== undefined) {
        params.set("q", query);
      }

      if (label !== undefined) {
        params.set("label", label);
      }

      const suffix = params.size === 0 ? "" : `?${params.toString()}`;

      return reply(await call("GET", `/contacts${suffix}`));
    },
  );

  server.registerTool(
    "get_contact",
    {
      description:
        "Get one Contact with their Timeline of logged Interactions (newest first) and their Notes.",
      inputSchema: z.object({ contactId: id }),
      annotations: { readOnlyHint: true },
    },
    async ({ contactId }) => {
      const id = encodeURIComponent(contactId);
      const contact = await call("GET", `/contacts/${id}`);

      if (!contact.ok) {
        return reply(contact);
      }

      const [interactions, notes] = await Promise.all([
        call("GET", `/contacts/${id}/interactions`),
        call("GET", `/contacts/${id}/notes`),
      ]);

      if (!interactions.ok || !notes.ok) {
        return reply(interactions.ok ? notes : interactions);
      }

      return reply({
        ok: true,
        status: 200,
        body: {
          contact: (contact.body as { contact: unknown }).contact,
          interactions: (interactions.body as { interactions: unknown }).interactions,
          notes: (notes.body as { notes: unknown }).notes,
        },
      });
    },
  );

  server.registerTool(
    "log_interaction",
    {
      description:
        "Log an Interaction with a Contact on their Timeline: a call, meeting, message or other, on a given day (YYYY-MM-DD), with an optional note.",
      inputSchema: z.object({
        contactId: id,
        type: z.enum(interactionTypes),
        occurredOn: z.string().describe("The day it happened, YYYY-MM-DD"),
        note: z.string().optional(),
      }),
    },
    async ({ contactId, type, occurredOn, note }) =>
      reply(
        await call("POST", `/contacts/${encodeURIComponent(contactId)}/interactions`, {
          type,
          occurredOn,
          note: note ?? null,
        }),
      ),
  );

  server.registerTool(
    "add_note",
    {
      description: "Add a freeform Note to a Contact: something worth remembering about them.",
      inputSchema: z.object({ contactId: id, body: z.string() }),
    },
    async ({ contactId, body }) =>
      reply(await call("POST", `/contacts/${encodeURIComponent(contactId)}/notes`, { body })),
  );

  server.registerTool(
    "add_reminder",
    {
      description:
        "Add a Reminder to reach out to a Contact by a given day (YYYY-MM-DD), such as \"call Bob by October 20\".",
      inputSchema: z.object({
        contactId: id,
        body: z.string(),
        dueOn: z.string().describe("The day it is due, YYYY-MM-DD"),
      }),
    },
    async ({ contactId, body, dueOn }) =>
      reply(
        await call("POST", `/contacts/${encodeURIComponent(contactId)}/reminders`, { body, dueOn }),
      ),
  );

  server.registerTool(
    "create_contact",
    {
      description:
        "Create a Contact: a person the user knows. Only the name is required; add whatever else is known.",
      inputSchema: z.object({ name: z.string(), ...contactDetails }),
    },
    async (details) => reply(await call("POST", "/contacts", details)),
  );

  server.registerTool(
    "update_contact",
    {
      description:
        "Change a Contact's details. Pass only the fields to change; everything else stays as it is. Use null to clear a field.",
      inputSchema: z.object({
        contactId: id,
        name: z.string().optional(),
        ...contactDetails,
      }),
    },
    async ({ contactId, ...changes }) => {
      const path = `/contacts/${encodeURIComponent(contactId)}`;
      const current = await call("GET", path);

      if (!current.ok) {
        return reply(current);
      }

      // The API replaces a Contact wholesale, so start from what is saved.
      const saved = (current.body as { contact: Record<string, unknown> }).contact;
      const kept = Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, saved[field]]));
      const given = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );

      return reply(await call("PUT", path, { ...kept, ...given }));
    },
  );

  server.registerTool(
    "delete_contact",
    {
      description:
        "Delete a Contact and everything logged against them: Timeline (with its Attachments), Notes, Reminders, Important Dates. The user is asked to confirm first, and nothing is deleted unless they say yes.",
      inputSchema: z.object({ contactId: id }),
      annotations: { destructiveHint: true },
    },
    async ({ contactId }, ctx) => {
      const path = `/contacts/${encodeURIComponent(contactId)}`;
      const current = await call("GET", path);

      if (!current.ok) {
        return reply(current);
      }

      const name = (current.body as { contact: { name: string } }).contact.name;
      const gate = askBeforeDeleting(
        ctx,
        `Delete ${name} and everything logged about them? This can't be undone.`,
      );

      return gate === "confirmed" ? reply(await call("DELETE", path)) : gate;
    },
  );

  for (const kind of loggedKinds) {
    registerDeleteLogged(server, call, kind);
  }
}
