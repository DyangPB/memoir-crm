import { isIsoDay } from "@memoir/core";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(isoDay: string): string {
  return dayFormat.format(new Date(`${isoDay}T00:00:00.000Z`));
}

/** The text when it is a real YYYY-MM-DD day, otherwise null. */
export function isoDayOrNull(value: string | null): string | null {
  return value !== null && isIsoDay(value) ? value : null;
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

/** A file size for a download chip: "512 B", "48 KB", "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** How long ago a moment was, in the words the sync status uses: "just now", "4 min ago". */
export function formatAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? "1 day ago" : `${days} days ago`;
}
