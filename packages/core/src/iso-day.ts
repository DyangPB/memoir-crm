const MS_PER_DAY = 86_400_000;

export function dayMs(isoDay: string): number {
  return Date.parse(`${isoDay}T00:00:00.000Z`);
}

/** The ISO day `days` after (or before, when negative) another. */
export function addDays(isoDay: string, days: number): string {
  return new Date(dayMs(isoDay) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** 0 for Sunday through 6 for Saturday. */
export function weekdayOf(isoDay: string): number {
  return new Date(dayMs(isoDay)).getUTCDay();
}
