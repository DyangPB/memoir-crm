const MS_PER_DAY = 86_400_000;

function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Whole calendar days between an Interaction date and now, driving the app's
 * "days since you talked" numeral. Future dates clamp to 0.
 */
export function daysSince(from: Date, now: Date): number {
  const days = Math.round((utcMidnight(now) - utcMidnight(from)) / MS_PER_DAY);

  return Math.max(0, days);
}
