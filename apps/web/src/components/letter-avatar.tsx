import { letterFor } from "@memoir/core";

type LetterAvatarProps = {
  name: string;
};

export function LetterAvatar({ name }: LetterAvatarProps) {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-soft font-display text-body-lg text-ink"
    >
      {letterFor(name)}
    </span>
  );
}
