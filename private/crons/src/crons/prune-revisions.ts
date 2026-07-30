import { pruneRevisions, revisionsKeptPerEntry } from '@repo/content/prune-revisions';
import type { Logger } from '@repo/logging';

// Entry revisions grow with every edit, so each entry keeps only its newest
// few (see the cap in @repo/content) and the rest are swept nightly.
export async function pruneRevisionsCron(log: Logger): Promise<void> {
  const removed = await pruneRevisions();
  log.set({ cron: { removed } });
  log.info(`Removed ${removed} revisions beyond the newest ${revisionsKeptPerEntry} per entry.`);
}
