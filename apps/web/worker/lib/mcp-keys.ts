import { mcpKeys } from "@memoir/db";
import { and, desc, eq } from "drizzle-orm";

import { createDb } from "./db";

const SECRET_PREFIX = "mem_";
const SECRET_BYTES = 32;
const DISPLAY_PREFIX_LENGTH = SECRET_PREFIX.length + 4;

export type McpKeySummary = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type McpKeyRow = typeof mcpKeys.$inferSelect;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/**
 * Keys are 256 random bits, so a fast unsalted hash is enough to keep them
 * unrecoverable from the database; password-style stretching adds nothing.
 */
export async function hashMcpSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toSummary(row: McpKeyRow): McpKeySummary {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

export async function createMcpKey(
  env: Env,
  userId: string,
  name: string,
): Promise<{ key: McpKeySummary; secret: string }> {
  const secret = `${SECRET_PREFIX}${toBase64Url(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)))}`;
  const [row] = await createDb(env)
    .insert(mcpKeys)
    .values({
      id: crypto.randomUUID(),
      userId,
      name,
      prefix: secret.slice(0, DISPLAY_PREFIX_LENGTH),
      keyHash: await hashMcpSecret(secret),
    })
    .returning();

  if (row === undefined) {
    throw new Error("The key was not saved.");
  }

  return { key: toSummary(row), secret };
}

export async function listMcpKeys(env: Env, userId: string): Promise<McpKeySummary[]> {
  const rows = await createDb(env)
    .select()
    .from(mcpKeys)
    .where(eq(mcpKeys.userId, userId))
    .orderBy(desc(mcpKeys.createdAt));

  return rows.map(toSummary);
}

/** True when the user owned that key and it is now gone. */
export async function revokeMcpKey(env: Env, userId: string, keyId: string): Promise<boolean> {
  const deleted = await createDb(env)
    .delete(mcpKeys)
    .where(and(eq(mcpKeys.id, keyId), eq(mcpKeys.userId, userId)))
    .returning({ id: mcpKeys.id });

  return deleted.length > 0;
}

/** The user a live `Authorization: Bearer mem_...` header belongs to, or null. */
export async function userForMcpAuthorization(
  env: Env,
  authorization: string | null,
): Promise<string | null> {
  const match = /^Bearer (mem_\S+)$/.exec(authorization ?? "");

  if (match?.[1] === undefined) {
    return null;
  }

  const rows = await createDb(env)
    .select({ userId: mcpKeys.userId })
    .from(mcpKeys)
    .where(eq(mcpKeys.keyHash, await hashMcpSecret(match[1])))
    .limit(1);

  return rows[0]?.userId ?? null;
}
