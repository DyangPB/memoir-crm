import { daysUntilOccurrence, nextOccurrence } from "@memoir/core";

import { formatDay } from "./format";

export const BIRTHDAY_WINDOW_DAYS = 7;

export function importantDateTiming(fallsOn: string, now: Date): string {
  const days = daysUntilOccurrence(fallsOn, now);

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days <= 30) {
    return `In ${days} days`;
  }

  return formatDay(nextOccurrence(fallsOn, now));
}
