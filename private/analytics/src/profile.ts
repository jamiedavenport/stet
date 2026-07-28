/**
 * Splits a display name into the first/last shape OpenPanel profiles use.
 * Internal helper shared by the browser and Worker identify calls.
 */
export function toProfileName(name: string | undefined): {
  firstName?: string;
  lastName?: string;
} {
  if (name === undefined || name.trim().length === 0) {
    return {};
  }
  const [firstName, ...rest] = name.trim().split(/\s+/);
  if (rest.length === 0) {
    return { firstName };
  }
  return { firstName, lastName: rest.join(' ') };
}
