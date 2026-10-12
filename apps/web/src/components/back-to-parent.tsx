import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

type BackToParentProps = {
  label: string;
  to: string;
};

export function BackToParent({ label, to }: BackToParentProps) {
  return (
    <Link
      className="-ml-2 inline-flex w-fit min-h-11 items-center gap-2 whitespace-nowrap rounded-sm px-2 text-body-md text-ink-secondary transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      to={to}
    >
      <ArrowLeft aria-hidden className="size-4 shrink-0 text-ink-mute" />
      {label}
    </Link>
  );
}
