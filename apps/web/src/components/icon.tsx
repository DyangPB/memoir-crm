import { cn } from "../lib/utils";

type IconProps = {
  className?: string;
  filled?: boolean;
  /** Material Symbols ligature name, e.g. "arrow_back". */
  name: string;
};

export function Icon({ className, filled = false, name }: IconProps) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined", className)}
      style={filled ? { fontVariationSettings: '"FILL" 1' } : undefined}
    >
      {name}
    </span>
  );
}
