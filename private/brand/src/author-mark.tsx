// The jxd.dev logo mark, for "built by" attribution. The base squares use
// currentColor so the mark adapts to light and dark surfaces.
export function AuthorMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M0 0h8v8H0zM0 8h16v8H0z" />
      <path fill="#dc2626" d="M8 0h8v8H8z" />
    </svg>
  );
}
