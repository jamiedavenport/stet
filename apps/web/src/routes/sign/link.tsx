import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { MagicLinkRequest } from '#/auth/magic-link-request.tsrx';

export const Route = createFileRoute('/sign/link')({
  // A failed verification redirects back here with ?error= (see the
  // errorCallbackURL passed when requesting the link).
  validateSearch: z.object({
    error: z.string().optional().catch(undefined),
  }),
  component: MagicLinkRequest,
});
