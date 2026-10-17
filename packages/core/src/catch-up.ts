import { daysSince } from "./days-since";

/** Quiet for more than this many days puts a Contact on the Dashboard's catch-up list. */
export const CATCH_UP_AFTER_DAYS = 30;

/**
 * Contacts the user has gone quiet on, quietest first. A Contact with no
 * Interactions yet has no "days since" to show, so it is not listed.
 */
export function contactsToCatchUp<T extends { lastInteractionAt: string | null }>(
  contacts: readonly T[],
  now: Date,
): (T & { daysSince: number })[] {
  return contacts
    .flatMap((contact) =>
      contact.lastInteractionAt === null
        ? []
        : [{ ...contact, daysSince: daysSince(new Date(contact.lastInteractionAt), now) }],
    )
    .filter((contact) => contact.daysSince > CATCH_UP_AFTER_DAYS)
    .sort((left, right) => right.daysSince - left.daysSince);
}
