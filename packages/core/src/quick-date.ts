import { isIsoDay } from "./contact";

export type QuickDateResult = { ok: true; dueOn: string } | { ok: false };

const MS_PER_DAY = 86_400_000;
const FEB_29_LOOKAHEAD_YEARS = 8;

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thur: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function addDays(isoDay: string, days: number): string {
  return new Date(Date.parse(`${isoDay}T00:00:00.000Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function isoDay(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthDay(
  monthWord: string,
  dayText: string,
  yearText: string | undefined,
  today: string,
): QuickDateResult {
  const month = MONTHS[monthWord];
  const day = Number(dayText);

  if (month === undefined) {
    return { ok: false };
  }

  if (yearText !== undefined) {
    const written = isoDay(Number(yearText), month, day);

    return isIsoDay(written) ? { ok: true, dueOn: written } : { ok: false };
  }

  const firstYear = Number(today.slice(0, 4));

  for (let year = firstYear; year <= firstYear + FEB_29_LOOKAHEAD_YEARS; year += 1) {
    const candidate = isoDay(year, month, day);

    if (isIsoDay(candidate) && candidate >= today) {
      return { ok: true, dueOn: candidate };
    }
  }

  return { ok: false };
}

/**
 * Reads the date a user typed into the quick-add field ("in 3 days", "next Friday",
 * "Oct 28") relative to `today`, an ISO day in the user's own calendar. Text it
 * can't read comes back as a failure so the caller can fall back to a date picker.
 */
export function parseQuickDate(text: string, today: string): QuickDateResult {
  const phrase = text.trim().toLowerCase();

  if (phrase === "today") {
    return { ok: true, dueOn: today };
  }

  if (phrase === "tomorrow") {
    return { ok: true, dueOn: addDays(today, 1) };
  }

  if (isIsoDay(phrase)) {
    return { ok: true, dueOn: phrase };
  }

  const offset = /^in (\d{1,4}) (day|days|week|weeks)$/.exec(phrase);

  if (offset?.[1] !== undefined && offset[2] !== undefined) {
    const unitDays = offset[2].startsWith("week") ? 7 : 1;

    return { ok: true, dueOn: addDays(today, Number(offset[1]) * unitDays) };
  }

  const weekday = /^(?:next )?([a-z]+)$/.exec(phrase);
  const target = weekday?.[1] === undefined ? undefined : WEEKDAYS[weekday[1]];

  if (target !== undefined) {
    const todayIndex = new Date(`${today}T00:00:00.000Z`).getUTCDay();
    const ahead = ((target - todayIndex + 6) % 7) + 1;

    return { ok: true, dueOn: addDays(today, ahead) };
  }

  const monthFirst = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?$/.exec(phrase);

  if (monthFirst?.[1] !== undefined && monthFirst[2] !== undefined) {
    return monthDay(monthFirst[1], monthFirst[2], monthFirst[3], today);
  }

  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.?(?:,? (\d{4}))?$/.exec(phrase);

  if (dayFirst?.[1] !== undefined && dayFirst[2] !== undefined) {
    return monthDay(dayFirst[2], dayFirst[1], dayFirst[3], today);
  }

  return { ok: false };
}
