import type { GoogleStatus } from "@memoir/core";

import { formatAgo } from "../lib/format";
import { cn } from "../lib/utils";
import { Icon } from "./icon";

type GoogleSyncPillProps = {
  status: GoogleStatus;
  syncing: boolean;
  onRefresh: () => void;
};

/** "Synced · 4 min ago", with a refresh, shown on the Calendar while Google is connected. */
export function GoogleSyncPill({ status, syncing, onRefresh }: GoogleSyncPillProps) {
  const failed = status.lastError !== null;
  const label = syncing
    ? "Syncing with Google Calendar"
    : failed
      ? status.lastError
      : status.lastSyncedAt === null
        ? "Not synced yet"
        : `Google Calendar synced · ${formatAgo(status.lastSyncedAt, new Date())}`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-caption",
        failed && !syncing
          ? "border-danger/30 bg-danger-bg text-danger"
          : "border-hairline bg-canvas-soft text-ink-secondary",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          failed && !syncing ? "bg-danger" : "bg-success-fill",
          syncing && "animate-pulse",
        )}
      />
      <span role="status">{label}</span>
      <button
        aria-label="Refresh Google Calendar"
        className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-canvas disabled:opacity-50"
        disabled={syncing}
        onClick={onRefresh}
        type="button"
      >
        <Icon className={cn("text-base", syncing && "animate-spin")} name="sync" />
      </button>
    </div>
  );
}
