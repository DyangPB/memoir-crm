import { nextReminderEvent, reminderStatusAt, type ReminderStatus } from "@memoir/core";
import { reminders } from "@memoir/db";
import { DurableObject } from "cloudflare:workers";
import { and, eq, inArray, ne } from "drizzle-orm";

import { createDb } from "../lib/db";

type ScheduleItem = { id: string; dueOn: string; status: ReminderStatus };

/**
 * One Durable Object per user holds that user's reminder schedule. The single
 * alarm always points at the next due event; the alarm handler is the only
 * writer of due and overdue transitions, the HTTP API only reads and schedules.
 */
export class ReminderEngine extends DurableObject<Env> {
  /** Called whenever a user's Reminders change: aim the alarm at the next due event. */
  async reschedule(): Promise<void> {
    await this.schedule(await this.openSchedule());
  }

  override async alarm(): Promise<void> {
    const now = new Date();
    const rows = await this.openSchedule();
    const scheduled: ScheduleItem[] = [];
    const changed = new Map<ReminderStatus, string[]>();

    for (const row of rows) {
      const status = reminderStatusAt(row, now);

      scheduled.push({ id: row.id, dueOn: row.dueOn, status });

      if (status !== row.status) {
        const ids = changed.get(status);

        if (ids === undefined) {
          changed.set(status, [row.id]);
        } else {
          ids.push(row.id);
        }
      }
    }

    await this.writeStatuses(changed, now);
    await this.schedule(scheduled);
  }

  private async openSchedule(): Promise<ScheduleItem[]> {
    const userId = this.ctx.id.name;

    if (userId === undefined) {
      throw new Error("Reminder engine has no user");
    }

    return createDb(this.env)
      .select({ id: reminders.id, dueOn: reminders.dueOn, status: reminders.status })
      .from(reminders)
      .where(and(eq(reminders.userId, userId), ne(reminders.status, "done")));
  }

  private async writeStatuses(changed: Map<ReminderStatus, string[]>, now: Date): Promise<void> {
    const db = createDb(this.env);

    for (const [status, ids] of changed) {
      await db.update(reminders).set({ status, updatedAt: now }).where(inArray(reminders.id, ids));
    }
  }

  private async schedule(items: readonly ScheduleItem[]): Promise<void> {
    const next = nextReminderEvent(items);
    const scheduled = await this.ctx.storage.getAlarm();

    if (next === null) {
      if (scheduled !== null) {
        await this.ctx.storage.deleteAlarm();
      }

      return;
    }

    if (scheduled !== next.getTime()) {
      await this.ctx.storage.setAlarm(next);
    }
  }
}
