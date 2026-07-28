import { createFileRoute, notFound } from '@tanstack/react-router';

import { CollectionEntries } from '#/content/collection-entries.tsrx';
import { findContentType } from '#/content/model';

export const Route = createFileRoute('/app/c/$collection/')({
  loader: ({ params }) => {
    const type = findContentType(params.collection);
    if (type === undefined) {
      throw notFound();
    }
    return type;
  },
  component: CollectionEntries,
});
