/* @jsxRuntime automatic @jsxImportSource react */
// The pragma pins the JSX runtime for the OG pipeline, whose tsx invocation
// compiles this file without reading this package's tsconfig.

// The mark is the four dots the logo sets under the wordmark: the
// proofreader's stet, "let it stand".

/** The artwork is a wide strip, so a caller sizing by width gets the height. */
const ASPECT = 50 / 260;

const dots = [25, 95, 165, 235];

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
  /** Width in pixels. The height follows from the artwork. */
  size?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 260 50"
      aria-hidden="true"
      className={className}
      width={size}
      height={size === undefined ? undefined : Math.round(size * ASPECT)}
    >
      {dots.map((cx) => (
        <circle key={cx} cx={cx} cy="25" r="25" fill={color} />
      ))}
    </svg>
  );
}
