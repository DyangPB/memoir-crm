import type { Interaction } from "./interaction";

/** A past Interaction from today's calendar date, surfaced as a memory on the Dashboard. */
export type OnThisDay = Interaction & {
  contactName: string;
  yearsAgo: number;
};

/**
 * The Interaction to resurface for `today` (an ISO day): the most recent one on
 * the same month and day in an earlier year. Ties keep list order.
 */
export function pickOnThisDay<T extends { occurredOn: string }>(
  interactions: readonly T[],
  today: string,
): (T & { yearsAgo: number }) | null {
  const todayYear = Number(today.slice(0, 4));
  const monthDay = today.slice(5);
  let picked: T | null = null;

  for (const interaction of interactions) {
    const year = Number(interaction.occurredOn.slice(0, 4));

    if (
      interaction.occurredOn.slice(5) !== monthDay ||
      year >= todayYear ||
      (picked !== null && year <= Number(picked.occurredOn.slice(0, 4)))
    ) {
      continue;
    }

    picked = interaction;
  }

  return picked === null
    ? null
    : { ...picked, yearsAgo: todayYear - Number(picked.occurredOn.slice(0, 4)) };
}
