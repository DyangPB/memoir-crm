import { Hono } from "hono";

import { auth } from "./routes/auth";
import { config } from "./routes/config";
import { health } from "./routes/health";

export const app = new Hono<{ Bindings: Env }>();

app.route("/api", health);
app.route("/api", auth);
app.route("/api", config);
