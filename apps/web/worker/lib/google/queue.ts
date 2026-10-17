import type { Context } from "hono";

import { syncGoogle } from "./sync";

/**
 * Pushes a user's change to Google after the response has gone out, so a slow or
 * failing Google never slows or fails the request. A no-op for anyone not connected.
 */
export function syncSoon(c: Context<{ Bindings: Env }>, userId: string): void {
  const run = syncGoogle(c.env, userId).catch((error: unknown) => {
    console.error("Google sync failed", error);
  });

  try {
    c.executionCtx.waitUntil(run);
  } catch {
    // No execution context (some test hosts): the promise still runs.
  }
}
