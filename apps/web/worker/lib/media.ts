import { interactionAttachments } from "@memoir/db";
import { and, eq } from "drizzle-orm";

import { inChunks } from "./chunks";
import { createDb } from "./db";

/** R2 deletes at most this many keys in one call. */
const R2_DELETE_LIMIT = 1000;

export function photoKey(userId: string, contactId: string): string {
  return `${userId}/photos/${contactId}`;
}

export function attachmentKey(userId: string, attachmentId: string): string {
  return `${userId}/attachments/${attachmentId}`;
}

/**
 * Removes files once their rows are gone. A failure is logged, not thrown: the
 * user's delete has already happened, and a stray file is better than a 500.
 */
export async function deleteObjects(env: Env, keys: readonly string[]): Promise<void> {
  for (const chunk of inChunks(keys, R2_DELETE_LIMIT)) {
    try {
      await env.MEDIA.delete(chunk);
    } catch (error) {
      console.error("Couldn't delete stored files", error);
    }
  }
}

/** Every file a user owns, for deleting their account or reseeding the demo. */
export async function deleteUserMedia(env: Env, userId: string): Promise<void> {
  let cursor: string | undefined;

  do {
    const listed = await env.MEDIA.list({ prefix: `${userId}/`, cursor });

    await deleteObjects(
      env,
      listed.objects.map((object) => object.key),
    );
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor !== undefined);
}

export async function attachmentKeysForInteraction(
  env: Env,
  userId: string,
  interactionId: string,
): Promise<string[]> {
  const rows = await createDb(env)
    .select({ key: interactionAttachments.objectKey })
    .from(interactionAttachments)
    .where(
      and(
        eq(interactionAttachments.userId, userId),
        eq(interactionAttachments.interactionId, interactionId),
      ),
    );

  return rows.map((row) => row.key);
}

export async function attachmentKeysForContact(
  env: Env,
  userId: string,
  contactId: string,
): Promise<string[]> {
  const rows = await createDb(env)
    .select({ key: interactionAttachments.objectKey })
    .from(interactionAttachments)
    .where(
      and(
        eq(interactionAttachments.userId, userId),
        eq(interactionAttachments.contactId, contactId),
      ),
    );

  return rows.map((row) => row.key);
}
