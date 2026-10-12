import { importantDateTiming } from "../lib/important-dates";

type ImportantDateMarkerProps = {
  fallsOn: string;
  now: Date;
};

export function ImportantDateMarker({ fallsOn, now }: ImportantDateMarkerProps) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-amber-fill" />
      <span className="rounded-full bg-amber-bg px-2 py-1 text-micro-cap uppercase tabular-nums text-amber">
        {importantDateTiming(fallsOn, now)}
      </span>
    </span>
  );
}
