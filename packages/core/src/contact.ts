export type SocialLink = {
  label: string;
  url: string;
};

export type ContactInput = {
  name: string;
  emails: string[];
  phones: string[];
  socialLinks: SocialLink[];
  birthday: string | null;
  howWeMet: string | null;
};

export type Contact = ContactInput & {
  id: string;
  lastInteractionAt: string | null;
  createdAt: string;
};

export type ContactParseResult =
  | { ok: true; contact: ContactInput }
  | { ok: false; message: string };

const NAME_MAX_LENGTH = 200;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^\S+@\S+$/;

export function isIsoDay(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeStringArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function parseSocialLinks(value: unknown): { ok: true; links: SocialLink[] } | { ok: false; message: string } {
  if (value === undefined || value === null) {
    return { ok: true, links: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, message: "Social links need to be a list of labels and URLs." };
  }

  const links: SocialLink[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, message: "Social links need a label and a URL." };
    }

    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const rawUrl = typeof record.url === "string" ? record.url.trim() : "";

    if (label === "" || rawUrl === "") {
      return { ok: false, message: "Social links need both a label and a URL." };
    }

    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, message: `"${rawUrl}" doesn't look like a link.` };
    }

    links.push({ label, url: parsed.toString() });
  }

  return { ok: true, links };
}

export function parseContactInput(input: unknown): ContactParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the contact as JSON." };
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (name.length === 0) {
    return { ok: false, message: "Add a name for this contact." };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, message: "That name is too long. Keep it under 200 characters." };
  }

  const emailsRaw = record.emails ?? [];

  if (!isStringArray(emailsRaw)) {
    return { ok: false, message: "Emails need to be a list of addresses." };
  }

  const emails = normalizeStringArray(emailsRaw);
  const badEmail = emails.find((email) => !EMAIL_PATTERN.test(email));

  if (badEmail !== undefined) {
    return { ok: false, message: `"${badEmail}" doesn't look like an email address.` };
  }

  const phonesRaw = record.phones ?? [];

  if (!isStringArray(phonesRaw)) {
    return { ok: false, message: "Phone numbers need to be a list." };
  }

  const phones = normalizeStringArray(phonesRaw);
  const socialLinks = parseSocialLinks(record.socialLinks);

  if (!socialLinks.ok) {
    return { ok: false, message: socialLinks.message };
  }

  const birthdayRaw = record.birthday ?? null;
  let birthday: string | null = null;

  if (birthdayRaw !== null) {
    if (typeof birthdayRaw !== "string" || !DATE_PATTERN.test(birthdayRaw.trim())) {
      return { ok: false, message: "Birthdays use the YYYY-MM-DD format." };
    }

    const trimmed = birthdayRaw.trim();

    if (!isIsoDay(trimmed)) {
      return { ok: false, message: "That birthday isn't a real date." };
    }

    birthday = trimmed;
  }

  const howWeMetRaw = record.howWeMet ?? null;

  if (howWeMetRaw !== null && typeof howWeMetRaw !== "string") {
    return { ok: false, message: "How you met needs to be text." };
  }

  const howWeMet = typeof howWeMetRaw === "string" && howWeMetRaw.trim() !== "" ? howWeMetRaw.trim() : null;

  return {
    ok: true,
    contact: { name, emails, phones, socialLinks: socialLinks.links, birthday, howWeMet },
  };
}

export function letterFor(name: string): string {
  const first = [...name.trim()].find((character) => /\p{L}|\p{N}/u.test(character));

  return first === undefined ? "?" : first.toUpperCase();
}
