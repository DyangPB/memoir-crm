export type Label = {
  id: string;
  name: string;
};

export type LabelSummary = Label & {
  contactCount: number;
};

export type LabelParseResult = { ok: true; name: string } | { ok: false; message: string };

const NAME_MAX_LENGTH = 50;

export function parseLabelInput(input: unknown): LabelParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the label as JSON." };
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (name === "") {
    return { ok: false, message: "Add a name for this label." };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, message: "That label name is too long. Keep it under 50 characters." };
  }

  return { ok: true, name };
}
