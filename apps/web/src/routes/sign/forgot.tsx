import { createFileRoute } from '@tanstack/react-router';

import { ForgotPassword } from '#/auth/forgot-password.tsrx';

export const Route = createFileRoute('/sign/forgot')({
  component: ForgotPassword,
});
