/**
 * The brand's airmail edge: a 6px band of diagonal stripes, ocean with one amber
 * stripe every fifth, drawn as an inline SVG pattern. It sits across the top of
 * every brand hero. In-app cards use the `airmail-edge` utility in index.css.
 */
export function AirmailEdge() {
  return (
    <svg aria-hidden className="block h-1.5 w-full">
      <defs>
        <pattern
          height="12"
          id="airmail-edge"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
          width="60"
        >
          <rect fill="var(--color-canvas)" height="12" width="60" />
          <rect fill="var(--color-primary)" height="12" width="4" />
          <rect fill="var(--color-primary)" height="12" width="4" x="12" />
          <rect fill="var(--color-primary)" height="12" width="4" x="24" />
          <rect fill="var(--color-primary)" height="12" width="4" x="36" />
          <rect fill="var(--color-amber-fill)" height="12" width="4" x="48" />
        </pattern>
      </defs>
      <rect fill="url(#airmail-edge)" height="6" width="100%" />
    </svg>
  );
}
