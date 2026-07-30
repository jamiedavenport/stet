import type { ContentChange, ContentChangeAction } from './events/content-changed';

// The batch a window accumulates, and the folding that keeps it small. Kept
// apart from ./batch, which persists it, because that module extends a
// Durable Object and so only loads inside the worker.

export type ChangeBatch = {
  /** When the window opened. */
  since: string;
  /** True once the window held more changes than one payload carries. */
  truncated: boolean;
  changes: ContentChange[];
};

/**
 * Records a window holds before it stops growing. A bulk change (a site
 * import, a collection deleted) is a resync for the receiver either way, so
 * past this the batch keeps what it has and says it is truncated instead of
 * building a payload nobody reads.
 */
export const maxBatchChanges = 200;

/**
 * Folds a change into a window, one record per subject: fifty edits to one
 * entry are one line in the payload, and the receiver rebuilds once.
 */
export function addChange(
  batch: ChangeBatch | undefined,
  change: ContentChange,
  now: Date,
): ChangeBatch {
  const open = batch ?? { since: now.toISOString(), truncated: false, changes: [] };
  const index = open.changes.findIndex(
    (existing) => existing.subject === change.subject && existing.id === change.id,
  );
  if (index === -1) {
    if (open.changes.length >= maxBatchChanges) {
      return { ...open, truncated: true };
    }
    return { ...open, changes: [...open.changes, change] };
  }

  const changes = [...open.changes];
  changes[index] = { ...change, action: foldAction(open.changes[index].action, change.action) };
  return { ...open, changes };
}

// Something created and then edited inside one window is still new to the
// receiver, so the create sticks. Everything else is the latest action:
// notably a create followed by a delete reports the delete, which is what an
// id that is no longer there means.
function foldAction(previous: ContentChangeAction, next: ContentChangeAction): ContentChangeAction {
  if (previous === 'created' && next === 'updated') {
    return 'created';
  }
  return next;
}
