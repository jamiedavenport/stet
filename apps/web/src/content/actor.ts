import type { Actor } from '@repo/audit';

/** The signed-in user acting through the app UI, for audit and revisions. */
export function appActor(userId: string): Actor {
  return { userId, via: 'app' };
}
