import { parseNoteInput, type Note } from "@memoir/core";
import { notes } from "@memoir/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { findOwnedContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import { getSessionUser } from "../lib/session";

type NoteRow = typeof notes.$inferSelect;

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    contactId: row.contactId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findOwnedNote(
  env: Env,
  userId: string,
  contactId: string,
  noteId: string,
): Promise<NoteRow | null> {
  const rows = await createDb(env)
    .select()
    .from(notes)
    .where(
      and(eq(notes.id, noteId), eq(notes.contactId, contactId), eq(notes.userId, userId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

export const notesRoutes = new Hono<{ Bindings: Env }>();

notesRoutes.get("/contacts/:contactId/notes", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const rows = await createDb(c.env)
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.contactId, contact.id)))
    .orderBy(desc(notes.createdAt));

  return c.json({ notes: rows.map(toNote) });
});

notesRoutes.post("/contacts/:contactId/notes", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("contactId"));

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const parsed = parseNoteInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const now = new Date();
  const row: NoteRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    contactId: contact.id,
    body: parsed.note.body,
    createdAt: now,
    updatedAt: now,
  };

  await createDb(c.env).insert(notes).values(row);

  return c.json({ note: toNote(row) }, 201);
});

notesRoutes.put("/contacts/:contactId/notes/:noteId", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contactId = c.req.param("contactId");
  const noteId = c.req.param("noteId");
  const existing = await findOwnedNote(c.env, user.id, contactId, noteId);

  if (existing === null) {
    return c.json({ error: "That note isn't here." }, 404);
  }

  const parsed = parseNoteInput(await c.req.json().catch(() => null));

  if (!parsed.ok) {
    return c.json({ error: parsed.message }, 400);
  }

  const updatedAt = new Date();

  await createDb(c.env)
    .update(notes)
    .set({ body: parsed.note.body, updatedAt })
    .where(
      and(eq(notes.id, noteId), eq(notes.contactId, contactId), eq(notes.userId, user.id)),
    );

  return c.json({ note: toNote({ ...existing, body: parsed.note.body, updatedAt }) });
});

notesRoutes.delete("/contacts/:contactId/notes/:noteId", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contactId = c.req.param("contactId");
  const noteId = c.req.param("noteId");
  const existing = await findOwnedNote(c.env, user.id, contactId, noteId);

  if (existing === null) {
    return c.json({ error: "That note isn't here." }, 404);
  }

  await createDb(c.env)
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.contactId, contactId), eq(notes.userId, user.id)));

  return c.body(null, 204);
});
