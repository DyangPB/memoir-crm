import { DEFAULT_CADENCE_DAYS } from "@memoir/core";
import { userSettings } from "@memoir/db";
import { eq } from "drizzle-orm";

import { createDb } from "./db";

/** The user's global Cadence in days, falling back to the app default until they set one. */
export async function defaultCadenceDays(env: Env, userId: string): Promise<number> {
  const rows = await createDb(env)
    .select({ days: userSettings.defaultCadenceDays })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return rows[0]?.days ?? DEFAULT_CADENCE_DAYS;
}

export async function saveDefaultCadenceDays(env: Env, userId: string, days: number): Promise<void> {
  await createDb(env)
    .insert(userSettings)
    .values({ userId, defaultCadenceDays: days })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { defaultCadenceDays: days, updatedAt: new Date() },
    });
}
