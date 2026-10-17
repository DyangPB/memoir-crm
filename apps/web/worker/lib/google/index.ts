import { GOOGLE_CALENDAR_SCOPE } from "@memoir/core";
import { accounts } from "@memoir/db";
import { and, eq } from "drizzle-orm";

import { createDb } from "../db";
import { GoogleAuthError, type GoogleCalendarClient } from "./client";
import { createHttpGoogleClient } from "./http-client";

export * from "./client";

type AccountRow = typeof accounts.$inferSelect;

const EXPIRY_MARGIN_MS = 60_000;

export type GoogleClientFactory = (
  env: Env,
  userId: string,
) => Promise<GoogleCalendarClient | null>;

let factoryOverride: GoogleClientFactory | null = null;

/** Tests swap the Google boundary for a fake; nothing else calls this. */
export function overrideGoogleClientFactory(factory: GoogleClientFactory | null): void {
  factoryOverride = factory;
}

/** The user's Google sign-in, when it was granted calendar access. */
export async function findCalendarAccount(env: Env, userId: string): Promise<AccountRow | null> {
  const rows = await createDb(env)
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "google")));

  return rows.find((row) => (row.scope ?? "").split(/[\s,]+/).includes(GOOGLE_CALENDAR_SCOPE)) ?? null;
}

async function freshAccessToken(env: Env, account: AccountRow): Promise<string> {
  const expiresAt = account.accessTokenExpiresAt?.getTime() ?? 0;

  if (account.accessToken !== null && expiresAt > Date.now() + EXPIRY_MARGIN_MS) {
    return account.accessToken;
  }

  if (
    account.refreshToken === null ||
    env.GOOGLE_CLIENT_ID === undefined ||
    env.GOOGLE_CLIENT_SECRET === undefined
  ) {
    throw new GoogleAuthError("Connect Google Calendar again.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new GoogleAuthError("Connect Google Calendar again.");
  }

  const token = (await response.json()) as { access_token: string; expires_in: number };

  await createDb(env)
    .update(accounts)
    .set({
      accessToken: token.access_token,
      accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    })
    .where(eq(accounts.id, account.id));

  return token.access_token;
}

/** A client for the user's Google Calendar, or null when they haven't granted access. */
export async function getGoogleClient(
  env: Env,
  userId: string,
): Promise<GoogleCalendarClient | null> {
  if (factoryOverride !== null) {
    return factoryOverride(env, userId);
  }

  const account = await findCalendarAccount(env, userId);

  return account === null
    ? null
    : createHttpGoogleClient(async () => freshAccessToken(env, (await findCalendarAccount(env, userId)) ?? account));
}
