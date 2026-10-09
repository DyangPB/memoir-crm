import { Hono } from "hono";

export const config = new Hono<{ Bindings: Env }>();

config.get("/config", (c) => {
  const googleEnabled =
    c.env.GOOGLE_CLIENT_ID !== undefined && c.env.GOOGLE_CLIENT_SECRET !== undefined;

  return c.json({ googleEnabled });
});
