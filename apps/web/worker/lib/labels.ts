import { labels } from "@memoir/db";
import { and, eq } from "drizzle-orm";

import { createDb } from "./db";

export type LabelRow = typeof labels.$inferSelect;

export async function findOwnedLabel(
  env: Env,
  userId: string,
  labelId: string,
): Promise<LabelRow | null> {
  const rows = await createDb(env)
    .select()
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}
