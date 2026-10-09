import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full rounded-sm border border-hairline-input bg-canvas px-3 py-2 text-body-md text-ink placeholder:text-ink-mute focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
