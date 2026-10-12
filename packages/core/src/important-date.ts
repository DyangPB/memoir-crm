import { isIsoDay } from "./contact";

const MS_PER_DAY = 86_400_000;
const NAME_MAX_LENGTH = 80;

export type ImportantDateSource = "manual" | "birthday";

export type ImportantDateInput = {
  name: string;
  fallsOn: string;
};

export type ImportantDate = ImportantDateInput & {
  id: string;
  contactId: string;
  source: ImportantDateSource;
  createdAt: string;
};

export type ImportantDateWithContact = ImportantDate & {
  contactName: string;
};

export type ImportantDateParseResult =
  | { ok: true; importantDate: ImportantDateInput }
  | { ok: false; message: string };

export function parseImportantDateInput(input: unknown): ImportantDateParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the important date as JSON." };
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (name === "") {
    return { ok: false, message: "Add a name for this date." };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, message: "That name is too long. Keep it under 80 characters." };
  }

  const fallsOn = typeof record.fallsOn === "string" ? record.fallsOn.trim() : "";

  if (!isIsoDay(fallsOn)) {
    return { ok: false, message: "Important Dates need a real date." };
  }

  return { ok: true, importantDate: { name, fallsOn } };
}

function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * The day and month land on the same date each year; a 29 February clamps to the
 * 28th in a common year rather than rolling into March.
 */
function occurrenceInYear(month: number, day: number, year: number): number {
  const candidate = Date.UTC(year, month - 1, day);

  if (new Date(candidate).getUTCMonth() !== month - 1) {
    return Date.UTC(year, month, 0);
  }

  return candidate;
}

function isoDay(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * The next yearly occurrence of an Important Date, on or after `now`. The stored
 * date keeps its original year so ages stay readable; only the day and month recur.
 */
export function nextOccurrence(fallsOn: string, now: Date): string {
  const month = Number(fallsOn.slice(5, 7));
  const day = Number(fallsOn.slice(8, 10));
  const year = now.getUTCFullYear();
  const thisYear = occurrenceInYear(month, day, year);

  return isoDay(thisYear < utcMidnight(now) ? occurrenceInYear(month, day, year + 1) : thisYear);
}

/** Whole days from `now` until the next yearly occurrence; 0 means today. */
export function daysUntilOccurrence(fallsOn: string, now: Date): number {
  const gap = Date.parse(`${nextOccurrence(fallsOn, now)}T00:00:00.000Z`) - utcMidnight(now);

  return Math.round(gap / MS_PER_DAY);
}

/** True when the next yearly occurrence lands within `days` days of today, today included. */
export function occursWithinDays(fallsOn: string, now: Date, days: number): boolean {
  return daysUntilOccurrence(fallsOn, now) <= days;
}

/**
 * Whole years from a stored date to its next occurrence: the age a birthday turns,
 * or how many years a milestone reaches. A date still in the future counts as 0.
 */
export function importantDateYears(fallsOn: string, now: Date): number {
  const elapsed = Number(nextOccurrence(fallsOn, now).slice(0, 4)) - Number(fallsOn.slice(0, 4));

  return Math.max(0, elapsed);
}
