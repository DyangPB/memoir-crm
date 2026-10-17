const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(isoDay: string): string {
  return dayFormat.format(new Date(`${isoDay}T00:00:00.000Z`));
}

export function todayIsoDay(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 10);
}

/**
 * The user's local day as the UTC-midnight Date that `daysSince` counts from, so
 * the numerals agree with the catch-up list and Cadence Health the server works out
 * from the same `?date=`.
 */
export function todayForDayCounts(): Date {
  return new Date(`${todayIsoDay()}T00:00:00.000Z`);
}
