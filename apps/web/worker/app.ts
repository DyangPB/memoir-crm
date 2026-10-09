import { Hono } from "hono";

import { auth } from "./routes/auth";
import { config } from "./routes/config";
import { contactsRoutes } from "./routes/contacts";
import { fieldsRoutes } from "./routes/fields";
import { health } from "./routes/health";
import { interactionsRoutes } from "./routes/interactions";
import { labelsRoutes } from "./routes/labels";
import { notesRoutes } from "./routes/notes";
import { remindersRoutes } from "./routes/reminders";

export const app = new Hono<{ Bindings: Env }>();

app.route("/api", health);
app.route("/api", auth);
app.route("/api", config);
app.route("/api", contactsRoutes);
app.route("/api", fieldsRoutes);
app.route("/api", interactionsRoutes);
app.route("/api", labelsRoutes);
app.route("/api", notesRoutes);
app.route("/api", remindersRoutes);
