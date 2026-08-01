import { Command } from 'commander';

import { resolveOrigin } from '#/client';
import * as ui from '#/ui';

export const orgCommand = new Command('org')
  .description('Show the organization your API key is scoped to')
  .option('--api-key <key>', 'Organization API key (defaults to STET_API_KEY)')
  .option('--url <url>', 'Origin of the Stet deployment')
  .option('--json', 'Print the organization as JSON')
  .action(async (options: { apiKey?: string; url?: string; json?: boolean }) => {
    // Imported when the command runs, not when the CLI starts: the client's
    // root entry is the one import plain Node cannot follow to workspace
    // TypeScript (it reaches @repo/api), and a static import here would take
    // every other command down with it when the CLI runs inside this repo.
    const { createStetClient, safe } = await import('@stetcms/client');

    const apiKey = options.apiKey ?? process.env.STET_API_KEY;
    if (apiKey === undefined || apiKey === '') {
      ui.fail('No API key. Pass --api-key or set STET_API_KEY.');
    }

    const origin = resolveOrigin(options.url);
    const client = createStetClient({ origin, apiKey });
    const { data, error, isDefined } = await safe(client.org.current());

    if (isDefined && error.code === 'UNAUTHORIZED') {
      ui.fail('Invalid or revoked API key.');
    }
    if (error !== null) {
      ui.fail(error.message !== '' ? error.message : `Could not reach ${origin}.`);
    }

    if (options.json === true) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const rows: [string, string][] = [
      ['Name', data.name],
      ['Slug', data.slug],
      ['Id', data.id],
      ['Server', origin],
    ];

    // Best-effort: a billing lookup failure never hides the organization.
    const billing = await safe(client.org.billing());
    if (billing.error === null) {
      const suffix = billing.data.cancelAtPeriodEnd ? ' (cancels at period end)' : '';
      rows.push(['Plan', `${billing.data.plan}${suffix}`]);
    }

    console.log(ui.keyValueRows(rows));
  });
