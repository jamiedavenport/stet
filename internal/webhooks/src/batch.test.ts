import { describe, expect, it } from 'vite-plus/test';

import { addChange, maxBatchChanges } from './changes';
import type { ChangeBatch } from './changes';
import type { ContentChange } from './events/content-changed';

const now = new Date('2026-07-30T12:00:00.000Z');

type EntryChange = Extract<ContentChange, { subject: 'entry' }>;

function entry(id: string, action: EntryChange['action'], title = 'Hello'): ContentChange {
  return { subject: 'entry', action, id, type: 'posts', slug: 'hello', title };
}

function fold(...changes: ContentChange[]): ChangeBatch {
  return changes.reduce<ChangeBatch | undefined>(
    (batch, change) => addChange(batch, change, now),
    undefined,
  ) as ChangeBatch;
}

describe('addChange', () => {
  it('opens the window at the first change', () => {
    expect(fold(entry('a', 'created'))).toMatchObject({
      since: now.toISOString(),
      truncated: false,
    });
  });

  it('keeps one record per subject, with the latest details', () => {
    const batch = fold(entry('a', 'created'), entry('b', 'updated'), entry('a', 'updated', 'Bye'));

    expect(batch.changes).toHaveLength(2);
    expect(batch.changes[0]).toMatchObject({ id: 'a', title: 'Bye' });
    expect(batch.changes[1]).toMatchObject({ id: 'b' });
  });

  it('leaves a subject created in the window reported as created', () => {
    const batch = fold(entry('a', 'created'), entry('a', 'updated'), entry('a', 'updated'));

    expect(batch.changes).toEqual([expect.objectContaining({ action: 'created' })]);
  });

  it('reports a subject deleted in the window as deleted', () => {
    const batch = fold(entry('a', 'created'), entry('a', 'deleted'));

    expect(batch.changes).toEqual([expect.objectContaining({ action: 'deleted' })]);
  });

  it('separates subjects that share an id', () => {
    const batch = fold(entry('a', 'updated'), {
      subject: 'type',
      action: 'updated',
      id: 'a',
      slug: 'posts',
      name: 'Posts',
    });

    expect(batch.changes.map((change) => change.subject)).toEqual(['entry', 'type']);
  });

  it('stops growing at the cap and says so', () => {
    const ids = Array.from({ length: maxBatchChanges + 5 }, (_, index) => `entry-${index}`);
    const batch = fold(...ids.map((id) => entry(id, 'created')));

    expect(batch.changes).toHaveLength(maxBatchChanges);
    expect(batch.truncated).toBe(true);
  });

  it('still folds into subjects already in a truncated batch', () => {
    const ids = Array.from({ length: maxBatchChanges + 5 }, (_, index) => `entry-${index}`);
    const batch = fold(...ids.map((id) => entry(id, 'created')), entry('entry-0', 'deleted'));

    expect(batch.changes[0]).toMatchObject({ id: 'entry-0', action: 'deleted' });
  });
});
