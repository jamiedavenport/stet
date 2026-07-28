import { getRouteApi } from '@tanstack/react-router';

import type { ContentType } from '#/content/model';

const route = getRouteApi('/app/c/$collection/');

// The entry list for one collection, and the single entry a map holds.
export function CollectionEntries() @{
  const type = route.useLoaderData();

  <div className="flex w-full flex-col gap-1">
    <h1 className="text-lg font-semibold tracking-tight">{type.name}</h1>
    <p className="text-sm text-muted-foreground">{summary(type)}</p>
  </div>
}

function summary(type: ContentType): string {
  if (type.kind === 'map') {
    return 'A map: one entry, addressed by name.';
  }
  return `${type.entries} entries, ${type.drafts} with unpublished changes.`;
}
