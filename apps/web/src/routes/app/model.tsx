import { createFileRoute } from '@tanstack/react-router';

import { ContentModel } from '#/content/content-model.tsrx';

export const Route = createFileRoute('/app/model')({
  component: ContentModel,
});
