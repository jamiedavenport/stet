import type { AuditAction, Via } from '@repo/audit';

import type { AuditRow } from '#/audit/functions';

// How the audit log reads in the UI. The action vocabulary lives in
// @repo/audit; this is the English for it, kept out of the components so a
// new action is one entry rather than a new branch.

const actionPhrases: Record<AuditAction, string> = {
  'type.create': 'created',
  'type.update': 'renamed',
  'type.delete': 'deleted',
  'field.create': 'added the field',
  'field.update': 'changed the field',
  'field.delete': 'deleted the field',
  'field.action.complete': 'completed the migration for',
  'entry.create': 'created',
  'entry.update': 'edited',
  'entry.delete': 'deleted',
  'entry.restore': 'restored',
  'asset.upload': 'uploaded',
};

/** Where a change came through, for the rows that did not come from the UI. */
export const viaLabels: Record<Via, string> = {
  app: 'app',
  ai: 'AI',
  import: 'import',
  editor: 'editor',
  restore: 'restore',
  system: 'system',
};

/**
 * The verb phrase between the actor and the subject. A rename carries both
 * names, so it says what it changed from rather than only what it is now.
 */
export function auditSentence(row: AuditRow): string {
  const phrase = actionPhrases[row.action] ?? 'changed';
  const from = row.details.from;
  if (typeof from === 'string' && from.length > 0) {
    return `${phrase} ${from} to`;
  }
  return phrase;
}
