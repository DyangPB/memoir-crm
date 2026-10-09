import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { authSchema, createDb } from "./db";
import { hashPassword, verifyPassword } from "./password";

export function createAuth(env: Env, requestUrl: string) {
  const db = createDb(env);

  return betterAuth({
    baseURL: new URL(requestUrl).origin,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", usePlural: true, schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    user: {
      deleteUser: { enabled: true },
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
  });
}
