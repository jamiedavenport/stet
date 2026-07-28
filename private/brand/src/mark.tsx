/* @jsxRuntime automatic @jsxImportSource react */
// The pragma pins the JSX runtime for the OG pipeline, whose tsx invocation
// compiles this file without reading this package's tsconfig.

// Placeholder mark: the proofreader's stet — a line of text with dots
// beneath it, "let it stand".

// `size` sets explicit dimensions for renderers with no CSS layout (satori
// in the OG pipeline); web consumers size through `className` instead.
// `color` is for those same renderers, where currentColor has no CSS
// inheritance to resolve against.
export function BrandMark({
  className,
  size,
  color = 'currentColor',
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} width={size} height={size}>
      <rect x="3.5" y="7.5" width="17" height="3" rx="1.5" fill={color} />
      <circle cx="6.5" cy="16" r="1.6" fill={color} />
      <circle cx="12" cy="16" r="1.6" fill={color} />
      <circle cx="17.5" cy="16" r="1.6" fill={color} />
    </svg>
  );
}
