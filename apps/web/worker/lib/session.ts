import { createAuth } from "./auth";

export async function getSessionUser(env: Env, request: Request) {
  const auth = createAuth(env, request.url);
  const session = await auth.api.getSession({ headers: request.headers });

  return session?.user ?? null;
}
