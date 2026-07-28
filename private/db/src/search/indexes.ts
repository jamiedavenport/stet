import { asset, user } from '../schema/index.ts';
import { ftsIndex } from './fts.ts';

/** Uploaded files, matched on the name the uploader's browser supplied. */
export const assetIndex = ftsIndex({
  table: asset,
  id: asset.id,
  columns: [asset.name],
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
export const ftsIndexes = [assetIndex, userIndex];
