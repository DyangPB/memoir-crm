# Reminders run on per-user Durable Object alarms, not cron sweeps or Queues

The reminder engine is one Durable Object per user holding that user's due-reminder schedule; the object's single alarm always points at the next due event (one-off Reminders and yearly Important Dates), then reschedules after firing. Decided 2026-10-07.

## Considered Options

- **Cron Trigger sweeping D1 (rejected).** Only 5 triggers per account on Free, static config, and the 10 ms free-tier CPU cap makes a global sweep fragile.
- **Queues with delay (rejected).** `delaySeconds` caps at 24 hours; reminders need weeks and months.
- **Workflows `step.sleep` (rejected for v1).** Workable (365-day sleeps, no idle billing) but adds a second mechanism for the same job.
- **Per-user DO alarms (chosen).** The documented Cloudflare pattern for exactly this: one alarm per object, unlimited objects, at-least-once delivery with retries, nothing billed while idle. "Built the scheduler on DO alarms" is also the portfolio-visible version of the feature.

## Consequences

- Each `setAlarm()` bills as one DO storage write (100K writes/day on Free) — fine at personal-CRM scale, but the per-user schedule should batch due events into single alarm firings.
- The alarm handler is the single writer of due/overdue state transitions; the HTTP API only reads and schedules.
