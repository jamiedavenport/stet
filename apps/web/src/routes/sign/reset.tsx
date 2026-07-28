import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ResetPassword } from '#/auth/reset-password.tsrx';

export const Route = createFileRoute('/sign/reset')({
  // Better Auth redirects here from the emailed link with `?token=...`, or
  // with `?error=INVALID_TOKEN` when the token is bad or expired.
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  component: ResetPassword,
});
