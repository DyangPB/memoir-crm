import { isIsoDay } from "./contact";

export const interactionTypes = ["call", "meeting", "message", "other"] as const;

export type InteractionType = (typeof interactionTypes)[number];

export type InteractionInput = {
  type: InteractionType;
  occurredOn: string;
  note: string | null;
};

export type Interaction = InteractionInput & {
  id: string;
  contactId: string;
  createdAt: string;
};

export type InteractionParseResult =
  | { ok: true; interaction: InteractionInput }
  | { ok: false; message: string };

const NOTE_MAX_LENGTH = 2000;

export function isInteractionType(value: unknown): value is InteractionType {
  return typeof value === "string" && (interactionTypes as readonly string[]).includes(value);
}

export function parseInteractionInput(input: unknown): InteractionParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the interaction as JSON." };
  }

  const record = input as Record<string, unknown>;

  if (!isInteractionType(record.type)) {
    return { ok: false, message: "Pick a type: call, meeting, message, or other." };
  }

  const occurredOn = typeof record.occurredOn === "string" ? record.occurredOn.trim() : "";

  if (!isIsoDay(occurredOn)) {
    return { ok: false, message: "Interactions need a real date." };
  }

  const noteRaw = record.note ?? null;

  if (noteRaw !== null && typeof noteRaw !== "string") {
    return { ok: false, message: "The note needs to be text." };
  }

  const note = typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : null;

  if (note !== null && note.length > NOTE_MAX_LENGTH) {
    return { ok: false, message: "That note is too long. Keep it under 2000 characters." };
  }

  return { ok: true, interaction: { type: record.type, occurredOn, note } };
}

export function lastInteractionDate(
  interactions: readonly { occurredOn: string }[],
): string | null {
  let latest: string | null = null;

  for (const interaction of interactions) {
    if (latest === null || interaction.occurredOn > latest) {
      latest = interaction.occurredOn;
    }
  }

  return latest;
}

export function interactionTypeLabel(type: InteractionType): string {
  switch (type) {
    case "call":
      return "Call";
    case "meeting":
      return "Meeting";
    case "message":
      return "Message";
    case "other":
      return "Other";
  }
}
