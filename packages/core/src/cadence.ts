import { daysSince } from "./days-since";

/** The global Cadence until the user sets their own in Settings. */
export const DEFAULT_CADENCE_DAYS = 30;

/** What a Contact says about its own Cadence: an optional override, or an opt-out. */
export type CadenceSettings = {
  cadenceDays: number | null;
  cadenceTracked: boolean;
};

/**
 * The target interval for a Contact, in days: its own override, else the
 * global default. A Contact that opted out has no target.
 */
export function effectiveCadenceDays(contact: CadenceSettings, defaultDays: number): number | null {
  if (!contact.cadenceTracked) {
    return null;
  }

  return contact.cadenceDays ?? defaultDays;
}

type Measurable = CadenceSettings & { lastInteractionAt: string | null };

/**
 * Contacts that can be judged against a Cadence: tracked, and with at least
 * one Interaction to count days from. Everyone else is neither in touch nor
 * past target.
 */
function measured<T extends Measurable>(
  contacts: readonly T[],
  now: Date,
  defaultDays: number,
): { contact: T; daysSince: number; target: number }[] {
  return contacts.flatMap((contact) => {
    const target = effectiveCadenceDays(contact, defaultDays);

    if (contact.lastInteractionAt === null || target === null) {
      return [];
    }

    return [{ contact, daysSince: daysSince(new Date(contact.lastInteractionAt), now), target }];
  });
}

/** Contacts past their effective Cadence, quietest first. */
export function contactsToCatchUp<T extends Measurable>(
  contacts: readonly T[],
  now: Date,
  defaultDays: number,
): (T & { daysSince: number })[] {
  return measured(contacts, now, defaultDays)
    .filter((entry) => entry.daysSince > entry.target)
    .map((entry) => ({ ...entry.contact, daysSince: entry.daysSince }))
    .sort((left, right) => right.daysSince - left.daysSince);
}

export type CadenceHealth = {
  tracked: number;
  inTouch: number;
  percent: number;
};

/**
 * Share of measurable Contacts currently within their target interval, or
 * null when there is nobody to measure yet.
 */
export function cadenceHealth<T extends Measurable>(
  contacts: readonly T[],
  now: Date,
  defaultDays: number,
): CadenceHealth | null {
  const entries = measured(contacts, now, defaultDays);

  if (entries.length === 0) {
    return null;
  }

  const inTouch = entries.filter((entry) => entry.daysSince <= entry.target).length;

  return {
    tracked: entries.length,
    inTouch,
    percent: Math.round((inTouch / entries.length) * 100),
  };
}

/** The longest target a Contact can have: ten years. */
export const MAX_CADENCE_DAYS = 3650;

const CADENCE_DAYS_MESSAGE = `Cadence is a whole number of days, from 1 to ${MAX_CADENCE_DAYS}.`;

export type CadenceDaysParseResult =
  | { ok: true; days: number }
  | { ok: false; message: string };

export function parseCadenceDays(value: unknown): CadenceDaysParseResult {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_CADENCE_DAYS
  ) {
    return { ok: false, message: CADENCE_DAYS_MESSAGE };
  }

  return { ok: true, days: value };
}

export type CadenceParseResult =
  | { ok: true; cadence: CadenceSettings }
  | { ok: false; message: string };

/** A Contact's Cadence fields from a request body; absent means the global default, tracked. */
export function parseCadenceInput(record: Record<string, unknown>): CadenceParseResult {
  const rawDays = record.cadenceDays ?? null;
  let cadenceDays: number | null = null;

  if (rawDays !== null) {
    const days = parseCadenceDays(rawDays);

    if (!days.ok) {
      return { ok: false, message: days.message };
    }

    cadenceDays = days.days;
  }

  const rawTracked = record.cadenceTracked ?? true;

  if (typeof rawTracked !== "boolean") {
    return { ok: false, message: "Say whether to keep in touch with this contact: true or false." };
  }

  return { ok: true, cadence: { cadenceDays, cadenceTracked: rawTracked } };
}
