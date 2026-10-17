import { letterFor } from "@memoir/core";

import { cn } from "../lib/utils";

type LetterAvatarProps = {
  name: string;
  size?: "md" | "lg";
};

export const avatarSizeClass = { md: "size-10", lg: "size-16" } as const;

export function LetterAvatar({ name, size = "md" }: LetterAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-soft font-display text-body-lg text-ink",
        avatarSizeClass[size],
        size === "lg" && "text-display-md",
      )}
    >
      {letterFor(name)}
    </span>
  );
}
