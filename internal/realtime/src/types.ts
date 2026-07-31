export type PresenceUser = {
  id: string;
  image: string | null;
  name: string;
};

// Awareness states arrive from other clients, so validate the shape before
// rendering anything from them.
export function isPresenceUser(value: unknown): value is PresenceUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const user = value as { id?: unknown; image?: unknown; name?: unknown };
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    (typeof user.image === 'string' || user.image === null)
  );
}
