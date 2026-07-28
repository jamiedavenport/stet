import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { DeviceApproval } from '#/auth/device-approval.tsrx';
import { PageShell } from '#/components/page-shell';
import { requireSession } from '#/session';

// Verification page for the OAuth device flow: the CLI sends users here with
// `?user_code=…` and polls until the signed-in user approves or denies.
export const Route = createFileRoute('/device')({
  validateSearch: z.object({
    user_code: z.string().optional().catch(undefined),
  }),
  beforeLoad: ({ context, location }) => {
    requireSession(context.session, location);
  },
  component: DevicePage,
});

function DevicePage() {
  return (
    <PageShell>
      <DeviceApproval />
    </PageShell>
  );
}
