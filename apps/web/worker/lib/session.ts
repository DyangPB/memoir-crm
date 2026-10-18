import { createAuth } from "./auth";

type ActingUser = { id: string };

/**
 * Requests the MCP layer builds itself, mapped to the user their API key
 * belongs to. Only code holding the Request object can add to this, so no
 * header or cookie from outside can claim it.
 */
const actingUsers = new WeakMap<Request, ActingUser>();

export function actAs(request: Request, user: ActingUser): Request {
  actingUsers.set(request, user);

  return request;
}

export async function getSessionUser(env: Env, request: Request): Promise<ActingUser | null> {
  const acting = actingUsers.get(request);

  if (acting !== undefined) {
    return acting;
  }

  const auth = createAuth(env, request.url);
  const session = await auth.api.getSession({ headers: request.headers });

  return session?.user ?? null;
}
