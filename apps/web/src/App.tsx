import { daysSince } from "@memoir/core";

import { Button } from "./components/ui/button";

const SAMPLE_INTERACTION = new Date("2026-09-23T12:00:00.000Z");

export function App() {
  const days = daysSince(SAMPLE_INTERACTION, new Date());

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-micro-cap text-ink-mute">Memoir</p>
      <h1 className="font-display text-display-md text-ink">The app shell is in place.</h1>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-numeral tabular-nums text-ink">{days}</span>
        <span className="text-caption text-ink-mute">days since you talked</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </main>
  );
}
