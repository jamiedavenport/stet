import { asset, contentEntry, user } from '../schema/index.ts';
import { ftsIndex } from './fts.ts';

/** Uploaded files, matched on the name the uploader's browser supplied. */
export const assetIndex = ftsIndex({
  table: asset,
  id: asset.id,
  columns: [asset.name],
});

/**
 * Content entries, matched on title, handle, and the derived text columns
 * entry writes and the document mirror maintain (see `schema/content.ts`).
 */
export const entryIndex = ftsIndex({
  table: contentEntry,
  id: contentEntry.id,
  columns: [contentEntry.title, contentEntry.slug, contentEntry.fieldText, contentEntry.bodyText],
});

/**
 * Everyone on the platform. There is no tenant column to index here, so
 * callers must scope the hydrating query to the organizations they may read.
 */
export const userIndex = ftsIndex({
  table: user,
  id: user.id,
  columns: [user.name, user.email],
});

/** Every index `scripts/push-fts.ts` creates. New indexes go here. */
export const ftsIndexes = [assetIndex, entryIndex, userIndex];
