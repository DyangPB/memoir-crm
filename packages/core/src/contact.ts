import type { CadenceSettings } from "./cadence";
import { parseCadenceInput } from "./cadence";
import type { CustomFieldValues } from "./custom-field";
import type { Label } from "./label";

export type SocialLink = {
  label: string;
  url: string;
};

export type ContactInput = CadenceSettings & {
  name: string;
  emails: string[];
  phones: string[];
  socialLinks: SocialLink[];
  birthday: string | null;
  howWeMet: string | null;
  location: string | null;
  roleCompany: string | null;
  /** A canonical IANA timezone name such as "Europe/Lisbon". */
  timezone: string | null;
};

export type ContactWriteInput = ContactInput & {
  customFields: CustomFieldValues;
};

export type Contact = ContactInput & {
  customFields: CustomFieldValues;
  id: string;
  labels: Label[];
  lastInteractionAt: string | null;
  /**
   * Null when the Contact has no photo. Otherwise a number that changes whenever the
   * photo does, so a cached image is replaced; the photo is served from `/api/contacts/:id/photo`.
   */
  photoVersion: number | null;
  /** Target interval in days after the override and global default; null when opted out. */
  effectiveCadenceDays: number | null;
  createdAt: string;
};

export type ContactParseResult =
  | { ok: true; contact: ContactInput }
  | { ok: false; message: string };

const NAME_MAX_LENGTH = 200;
const PROFILE_TEXT_MAX_LENGTH = 200;
const TIMEZONE_MESSAGE = "That timezone isn't one I know. Use a name like Europe/Lisbon.";
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

function parseProfileText(
  value: unknown,
  labels: { notText: string; tooLong: string },
): { ok: true; text: string | null } | { ok: false; message: string } {
  if (value === undefined || value === null) {
    return { ok: true, text: null };
  }

  if (typeof value !== "string") {
    return { ok: false, message: labels.notText };
  }

  const trimmed = value.trim();

  if (trimmed.length > PROFILE_TEXT_MAX_LENGTH) {
    return { ok: false, message: labels.tooLong };
  }

  return { ok: true, text: trimmed === "" ? null : trimmed };
}

/** The canonical name of an IANA timezone, or null when the runtime doesn't know it. */
export function canonicalTimezone(value: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function parseTimezone(
  value: unknown,
): { ok: true; timezone: string | null } | { ok: false; message: string } {
  if (value === undefined || value === null) {
    return { ok: true, timezone: null };
  }

  if (typeof value !== "string") {
    return { ok: false, message: TIMEZONE_MESSAGE };
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return { ok: true, timezone: null };
  }

  const canonical = canonicalTimezone(trimmed);

  return canonical === null
    ? { ok: false, message: TIMEZONE_MESSAGE }
    : { ok: true, timezone: canonical };
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

  const location = parseProfileText(record.location, {
    notText: "Location needs to be text.",
    tooLong: "That location is too long. Keep it under 200 characters.",
  });

  if (!location.ok) {
    return { ok: false, message: location.message };
  }

  const roleCompany = parseProfileText(record.roleCompany, {
    notText: "Role or company needs to be text.",
    tooLong: "That role or company is too long. Keep it under 200 characters.",
  });

  if (!roleCompany.ok) {
    return { ok: false, message: roleCompany.message };
  }

  const timezone = parseTimezone(record.timezone);

  if (!timezone.ok) {
    return { ok: false, message: timezone.message };
  }

  const cadence = parseCadenceInput(record);

  if (!cadence.ok) {
    return { ok: false, message: cadence.message };
  }

  return {
    ok: true,
    contact: {
      name,
      emails,
      phones,
      socialLinks: socialLinks.links,
      birthday,
      howWeMet,
      location: location.text,
      roleCompany: roleCompany.text,
      timezone: timezone.timezone,
      ...cadence.cadence,
    },
  };
}

export function letterFor(name: string): string {
  const first = [...name.trim()].find((character) => /\p{L}|\p{N}/u.test(character));

  return first === undefined ? "?" : first.toUpperCase();
}
