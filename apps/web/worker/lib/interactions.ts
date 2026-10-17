import type { Interaction, InteractionAttachment } from "@memoir/core";
import { interactionAttachments, interactions } from "@memoir/db";
import { and, asc, eq } from "drizzle-orm";

import { createDb } from "./db";

export type InteractionRow = typeof interactions.$inferSelect;
export type AttachmentRow = typeof interactionAttachments.$inferSelect;

export function toAttachment(row: AttachmentRow): InteractionAttachment {
  return {
    id: row.id,
    interactionId: row.interactionId,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toInteraction(
  row: InteractionRow,
  attachments: InteractionAttachment[] = [],
): Interaction {
  return {
    id: row.id,
    contactId: row.contactId,
    type: row.type,
    occurredOn: row.occurredOn,
    note: row.note,
    attachments,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findOwnedInteraction(
  env: Env,
  userId: string,
  contactId: string,
  interactionId: string,
): Promise<InteractionRow | null> {
  const rows = await createDb(env)
    .select()
    .from(interactions)
    .where(
      and(
        eq(interactions.id, interactionId),
        eq(interactions.contactId, contactId),
        eq(interactions.userId, userId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function attachmentsByInteraction(
  env: Env,
  userId: string,
  filter: { contactId: string } | { interactionId: string },
): Promise<Map<string, InteractionAttachment[]>> {
  const scope =
    "contactId" in filter
      ? eq(interactionAttachments.contactId, filter.contactId)
      : eq(interactionAttachments.interactionId, filter.interactionId);
  const rows = await createDb(env)
    .select()
    .from(interactionAttachments)
    .where(and(eq(interactionAttachments.userId, userId), scope))
    .orderBy(asc(interactionAttachments.createdAt), asc(interactionAttachments.id));
  const map = new Map<string, InteractionAttachment[]>();

  for (const row of rows) {
    const existing = map.get(row.interactionId);

    if (existing === undefined) {
      map.set(row.interactionId, [toAttachment(row)]);
    } else {
      existing.push(toAttachment(row));
    }
  }

  return map;
}
