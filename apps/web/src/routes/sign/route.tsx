import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { PageShell } from '#/components/page-shell';
import { getSignConfig } from '#/auth/functions';

export const Route = createFileRoute('/sign')({
  // `redirect` carries the page to return to after signing in (e.g. an invite
  // link). Restricted to app-relative paths to prevent open redirects.
  validateSearch: z.object({
    redirect: z.string().startsWith('/').optional().catch(undefined),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({ to: search.redirect ?? '/app' });
    }
  },
  // Shared by every /sign page: which social buttons to show and whether to
  // render the Turnstile widget.
  loader: () => getSignConfig(),
  component: SignLayout,
});

function SignLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}
