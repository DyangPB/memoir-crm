import { localTime } from "@memoir/core";
import { useEffect, useState } from "react";

import { Icon } from "./icon";

const TICK_MS = 15_000;

type LocalClockProps = {
  timezone: string;
};

/** The time where the Contact is, kept current while the page stays open. */
export function LocalClock({ timezone }: LocalClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const time = localTime(timezone, now);

  if (time === null) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-ink-mute">
      <Icon className="text-base" name="schedule" />
      <span className="tabular-nums text-ink-secondary">{time}</span>
      <span>{timezone.replaceAll("_", " ")}</span>
    </span>
  );
}
