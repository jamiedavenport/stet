import { Command } from 'commander';

import { createClient } from '#/client';
import { loadAuth } from '#/store';
import * as ui from '#/ui';

export const whoamiCommand = new Command('whoami')
  .description('Show the account you are logged in as')
  .option('--json', 'Print the session as JSON')
  .action(async (options: { json?: boolean }) => {
    const stored = loadAuth();
    if (stored === null) {
      ui.fail('Not logged in. Run `stet login` first.');
    }

    const client = createClient(stored.origin);
    const fetchOptions = { headers: { Authorization: `Bearer ${stored.token}` } };

    const { data: session, error } = await client.getSession({ fetchOptions });
    if (error !== null) {
      ui.fail(error.message ?? `Could not reach ${stored.origin}.`);
    }
    if (session === null) {
      ui.fail('Your session has expired. Run `stet login` again.');
    }

    const { data: organizations } = await client.organization.list({ fetchOptions });
    const activeOrganization = organizations?.find(
      (organization) => organization.id === session.session.activeOrganizationId,
    );

    if (options.json === true) {
      // Keep the session token out of logs and pipelines.
      const { token: _token, ...safeSession } = session.session;
      const payload = {
        user: session.user,
        session: safeSession,
        activeOrganization: activeOrganization ?? null,
      };
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    const rows: [string, string][] = [
      ['Name', session.user.name],
      ['Email', session.user.email],
    ];
    if (activeOrganization !== undefined) {
      rows.push(['Org', activeOrganization.name]);
    }
    rows.push(['Server', stored.origin]);
    console.log(ui.keyValueRows(rows));
  });
