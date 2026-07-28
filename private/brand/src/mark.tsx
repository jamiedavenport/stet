/* @jsxRuntime automatic @jsxImportSource react */
// The pragma pins the JSX runtime for the OG pipeline, whose tsx invocation
// compiles this file without reading this package's tsconfig.

// Onyx gem mark, sourced from the jxd.dev site (gems.tsx).
const polys = [
  { points: '0.242,-0.619 0.403,-0.539 0.940,-0.231 0.564,-0.434', fill: '#161616' },
  { points: '0.564,-0.434 0.940,-0.231 0.940,0.012 0.564,-0.288', fill: '#0a0a0a' },
  {
    points:
      '0.564,-0.434 0.564,-0.288 0.013,0.029 -0.242,0.029 -0.564,-0.156 -0.564,-0.302 -0.013,-0.619 0.242,-0.619',
    fill: '#3d3d3d',
  },
  { points: '-0.564,-0.156 -0.940,0.231 -0.940,-0.012 -0.564,-0.302', fill: '#666666' },
  { points: '0.940,0.012 0.752,0.337 0.017,0.759 0.021,0.539', fill: '#0a0a0a' },
  { points: '-0.403,0.539 -0.322,0.759 -0.752,0.513 -0.940,0.231', fill: '#161616' },
  { points: '0.564,-0.288 0.940,0.012 0.021,0.539 0.013,0.029', fill: '#0a0a0a' },
  { points: '-0.242,0.029 -0.403,0.539 -0.940,0.231 -0.564,-0.156', fill: '#3d3d3d' },
  { points: '0.021,0.539 0.017,0.759 -0.322,0.759 -0.403,0.539', fill: '#0a0a0a' },
  { points: '0.013,0.029 0.021,0.539 -0.403,0.539 -0.242,0.029', fill: '#242424' },
];

// `size` sets explicit dimensions for renderers with no CSS layout (satori
// in the OG pipeline); web consumers size through `className` instead.
export function BrandMark({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="-1.040 -0.970 2.081 2.081"
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
    >
      {polys.map((poly) => (
        <polygon
          key={poly.points}
          points={poly.points}
          fill={poly.fill}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={0.02}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
