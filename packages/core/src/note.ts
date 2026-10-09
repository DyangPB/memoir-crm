export type NoteInput = {
  body: string;
};

export type Note = NoteInput & {
  id: string;
  contactId: string;
  createdAt: string;
};

export type NoteParseResult = { ok: true; note: NoteInput } | { ok: false; message: string };

const BODY_MAX_LENGTH = 5000;

export function parseNoteInput(input: unknown): NoteParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the note as JSON." };
  }

  const record = input as Record<string, unknown>;
  const body = typeof record.body === "string" ? record.body.trim() : "";

  if (body === "") {
    return { ok: false, message: "Write something in the note first." };
  }

  if (body.length > BODY_MAX_LENGTH) {
    return { ok: false, message: "That note is too long. Keep it under 5000 characters." };
  }

  return { ok: true, note: { body } };
}
