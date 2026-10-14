import { Hono } from "hono";

import { openDemoAccount } from "../lib/demo";

export const demoRoutes = new Hono<{ Bindings: Env }>();

demoRoutes.post("/demo", async (c) => {
  const demo = await openDemoAccount(c.env, c.req.url).catch((error: unknown) => {
    console.error("The demo account didn't open", error);

    return null;
  });

  if (demo === null) {
    return c.json({ error: "The demo didn't start. Try again." }, 503);
  }

  return c.json(
    { demo: { email: demo.email, contacts: demo.contacts } },
    200,
    { "set-cookie": demo.cookies },
  );
});
