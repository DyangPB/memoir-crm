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
