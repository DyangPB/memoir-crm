import { Hono } from "hono";

import { auth } from "./routes/auth";
import { cadenceRoutes } from "./routes/cadence";
import { calendarRoutes } from "./routes/calendar";
import { config } from "./routes/config";
import { contactsRoutes } from "./routes/contacts";
import { demoRoutes } from "./routes/demo";
import { fieldsRoutes } from "./routes/fields";
import { googleRoutes } from "./routes/google";
import { health } from "./routes/health";
import { importantDatesRoutes } from "./routes/important-dates";
import { interactionsRoutes } from "./routes/interactions";
import { labelsRoutes } from "./routes/labels";
import { createMcpRoutes } from "./routes/mcp";
import { mcpKeysRoutes } from "./routes/mcp-keys";
import { mediaRoutes } from "./routes/media";
import { notesRoutes } from "./routes/notes";
import { remindersRoutes } from "./routes/reminders";
import { settingsRoutes } from "./routes/settings";

export const app = new Hono<{ Bindings: Env }>();

app.route("/api", health);
app.route("/api", importantDatesRoutes);
app.route("/api", auth);
app.route("/api", cadenceRoutes);
app.route("/api", calendarRoutes);
app.route("/api", config);
app.route("/api", contactsRoutes);
app.route("/api", demoRoutes);
app.route("/api", fieldsRoutes);
app.route("/api", googleRoutes);
app.route("/api", interactionsRoutes);
app.route("/api", labelsRoutes);
app.route("/api", mcpKeysRoutes);
app.route(
  "/",
  createMcpRoutes((request, env, ctx) => app.fetch(request, env, ctx)),
);
app.route("/api", mediaRoutes);
app.route("/api", notesRoutes);
app.route("/api", remindersRoutes);
app.route("/api", settingsRoutes);
