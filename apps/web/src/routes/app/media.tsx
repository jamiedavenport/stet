import { createFileRoute } from '@tanstack/react-router';

import { MediaLibrary } from '#/files/media-library.tsrx';

export const Route = createFileRoute('/app/media')({
  component: MediaLibrary,
});
