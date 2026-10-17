import { cn } from "../lib/utils";

type DaysSinceProps = {
  days: number;
  /** The Contact's effective Cadence in days; null when they opted out. */
  targetDays: number | null;
  className?: string;
  numeralClassName?: string;
};

export function DaysSince({ days, targetDays, className, numeralClassName }: DaysSinceProps) {
  const pastTarget = targetDays !== null && days > targetDays;

  return (
    <span className={cn("flex items-baseline gap-1.5 text-caption text-ink-mute", className)}>
      <span
        className={cn(
          "font-display tabular-nums",
          pastTarget ? "text-amber" : "text-ink",
          numeralClassName,
        )}
      >
        {days}
      </span>
      days since you talked
      {pastTarget && <span className="sr-only">Past your Cadence of {targetDays} days.</span>}
    </span>
  );
}
