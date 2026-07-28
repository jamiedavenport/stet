import { createFileRoute } from '@tanstack/react-router';

import { TwoFactorVerify } from '#/auth/two-factor-verify.tsrx';

export const Route = createFileRoute('/sign/2fa')({
  component: TwoFactorVerify,
});
