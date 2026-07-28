export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  return initials.toUpperCase();
}
