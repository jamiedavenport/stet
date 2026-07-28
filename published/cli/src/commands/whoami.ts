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
      console.error('Not logged in. Run `onyx login` first.');
      process.exit(1);
    }

    const client = createClient(stored.origin);
    const fetchOptions = { headers: { Authorization: `Bearer ${stored.token}` } };

    const { data: session, error } = await client.getSession({ fetchOptions });
    if (error !== null) {
      console.error(error.message ?? `Could not reach ${stored.origin}.`);
      process.exit(1);
    }
    if (session === null) {
      console.error('Your session has expired. Run `onyx login` again.');
      process.exit(1);
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
