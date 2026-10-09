import { Hono } from "hono";

import { auth } from "./routes/auth";
import { config } from "./routes/config";
import { contactsRoutes } from "./routes/contacts";
import { health } from "./routes/health";
import { interactionsRoutes } from "./routes/interactions";
import { notesRoutes } from "./routes/notes";

export const app = new Hono<{ Bindings: Env }>();

app.route("/api", health);
app.route("/api", auth);
app.route("/api", config);
app.route("/api", contactsRoutes);
app.route("/api", interactionsRoutes);
app.route("/api", notesRoutes);
