import { createFileRoute, notFound } from '@tanstack/react-router';

import { EntryEditor } from '#/content/entry-editor.tsrx';
import { findContentType } from '#/content/model';

export const Route = createFileRoute('/app/c/$collection/$entry')({
  loader: ({ params }) => {
    const type = findContentType(params.collection);
    if (type === undefined) {
      throw notFound();
    }
    return { type, entry: params.entry };
  },
  component: EntryEditor,
});
