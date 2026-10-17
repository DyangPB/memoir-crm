/**
 * The 24-hour wall-clock time ("13:05") in an IANA timezone at a given moment, for
 * the profile header's live clock. Null when the runtime doesn't know the timezone.
 */
export function localTime(timezone: string, now: Date): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;

    return hour === undefined || minute === undefined ? null : `${hour}:${minute}`;
  } catch {
    return null;
  }
}
