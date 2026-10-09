import { accounts, contacts, sessions, users, verifications } from "@memoir/db";
import { drizzle } from "drizzle-orm/d1";

export const authSchema = { accounts, sessions, users, verifications };
export const schema = { ...authSchema, contacts };

export function createDb(env: Env) {
  return drizzle(env.DB, { schema });
}
