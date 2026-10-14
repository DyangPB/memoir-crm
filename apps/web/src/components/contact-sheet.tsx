import type { ImgHTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

/**
 * A real product screenshot in its frame: rounded corners, a hairline border, and
 * the Level 2 panel shadow. Brand surfaces prove the product with these composites
 * instead of decorative imagery.
 */
export function ContactSheet({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-lg border border-hairline bg-canvas shadow-panel",
        className,
      )}
    >
      <img className="block h-auto w-full" decoding="async" {...props} />
    </figure>
  );
}

/**
 * The paper stack: two hairline sheets offset and barely rotated under a hero
 * card, like letters on a desk.
 */
export function PaperStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute inset-x-6 top-5 -bottom-4 rotate-[0.8deg] rounded-lg border border-hairline bg-canvas"
      />
      <div
        aria-hidden
        className="absolute inset-x-3 top-2 -bottom-2 -rotate-[0.5deg] rounded-lg border border-hairline bg-canvas-soft"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
