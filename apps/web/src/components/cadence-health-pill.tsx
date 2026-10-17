import type { CadenceHealth } from "@memoir/core";

type CadenceHealthPillProps = {
  health: CadenceHealth | null;
};

export function CadenceHealthPill({ health }: CadenceHealthPillProps) {
  if (health === null) {
    return null;
  }

  return (
    <span
      className="inline-flex w-fit items-center rounded-full bg-ocean-subdued px-3 py-1 text-label-lg tabular-nums text-primary-container"
      title={`${health.inTouch} of ${health.tracked} contacts are within their Cadence`}
    >
      {health.percent}% in touch
    </span>
  );
}
