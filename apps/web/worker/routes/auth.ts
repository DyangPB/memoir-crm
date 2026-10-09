import { Hono } from "hono";

import { createAuth } from "../lib/auth";

export const auth = new Hono<{ Bindings: Env }>();

auth.all("/auth/*", (c) => createAuth(c.env, c.req.url).handler(c.req.raw));
