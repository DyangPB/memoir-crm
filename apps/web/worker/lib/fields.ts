import type { FieldDefinition } from "@memoir/core";
import { contacts, fieldDefinitions } from "@memoir/db";
import { and, eq, sql } from "drizzle-orm";

import { createDb } from "./db";

export type FieldDefinitionRow = typeof fieldDefinitions.$inferSelect;

export function toFieldDefinition(row: FieldDefinitionRow): FieldDefinition {
  return { id: row.id, name: row.name, type: row.type, options: row.options };
}

export async function findOwnedFieldDefinition(
  env: Env,
  userId: string,
  fieldId: string,
): Promise<FieldDefinitionRow | null> {
  const rows = await createDb(env)
    .select()
    .from(fieldDefinitions)
    .where(and(eq(fieldDefinitions.id, fieldId), eq(fieldDefinitions.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listFieldDefinitions(
  env: Env,
  userId: string,
): Promise<FieldDefinitionRow[]> {
  return createDb(env)
    .select()
    .from(fieldDefinitions)
    .where(eq(fieldDefinitions.userId, userId))
    .orderBy(sql`lower(${fieldDefinitions.name})`);
}

export async function contactCountsByField(env: Env, userId: string): Promise<Map<string, number>> {
  const rows = await createDb(env)
    .select({ customFields: contacts.customFields })
    .from(contacts)
    .where(eq(contacts.userId, userId));

  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const fieldId of Object.keys(row.customFields)) {
      counts.set(fieldId, (counts.get(fieldId) ?? 0) + 1);
    }
  }

  return counts;
}
