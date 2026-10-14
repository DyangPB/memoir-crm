import { daysUntilOccurrence, nextOccurrence, UPCOMING_WINDOW_DAYS } from "@memoir/core";

import { formatDay } from "./format";

export function importantDateTiming(fallsOn: string, now: Date): string {
  const days = daysUntilOccurrence(fallsOn, now);

  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "tomorrow";
  }

  if (days <= UPCOMING_WINDOW_DAYS) {
    return `in ${days} days`;
  }

  return formatDay(nextOccurrence(fallsOn, now));
}
