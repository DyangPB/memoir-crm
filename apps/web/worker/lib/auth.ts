import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { accounts, sessions, users, verifications } from "@memoir/db";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";

import { hashPassword, verifyPassword } from "./password";

const schema = { accounts, sessions, users, verifications };

export function createAuth(env: Env, requestUrl: string) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    baseURL: new URL(requestUrl).origin,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", usePlural: true, schema }),
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
