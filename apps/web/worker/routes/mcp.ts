import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { Hono } from "hono";

import { userForMcpAuthorization } from "../lib/mcp-keys";
import { apiCallFor } from "../mcp/api-call";
import { registerTools } from "../mcp/tools";

/**
 * `dispatch` runs a request through the app's own /api routes, so each tool
 * gets the same validation and ownership checks as the web client does.
 */
export function createMcpRoutes(
  dispatch: (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>,
) {
  const routes = new Hono<{ Bindings: Env }>();

  routes.all("/mcp", async (c) => {
    const userId = await userForMcpAuthorization(c.env, c.req.header("authorization") ?? null);

    if (userId === null) {
      return c.json({ error: "Send a Memoir API key as a Bearer token." }, 401, {
        "www-authenticate": 'Bearer realm="memoir"',
      });
    }

    // Hono types the context narrowly; the runtime hands us the full Workers one.
    const ctx = c.executionCtx as ExecutionContext;
    const call = apiCallFor(
      (request) => dispatch(request, c.env, ctx),
      new URL(c.req.url).origin,
      userId,
    );

    return createMcpHandler(() => {
      const server = new McpServer({ name: "memoir", version: "1.0.0" });

      registerTools(server, call);

      return server;
    })(c.req.raw, c.env, ctx);
  });

  return routes;
}
