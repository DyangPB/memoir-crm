import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-sm border border-hairline-input bg-canvas px-3 text-body-md text-ink focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
