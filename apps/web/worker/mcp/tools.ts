import { interactionTypes } from "@memoir/core";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { ApiCall, ApiResult } from "./api-call";

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
      inputSchema: z.object({ contactId: z.string() }),
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
        contactId: z.string(),
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
      inputSchema: z.object({ contactId: z.string(), body: z.string() }),
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
        contactId: z.string(),
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
        contactId: z.string(),
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
}
