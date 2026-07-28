import { createStetClient, safe } from '@stet/client';
import { Command } from 'commander';

import { resolveOrigin } from '#/client';
import * as ui from '#/ui';

export const orgCommand = new Command('org')
  .description('Show the organization your API key is scoped to')
  .option('--api-key <key>', 'Organization API key (defaults to STET_API_KEY)')
  .option('--url <url>', 'Origin of the Stet deployment')
  .option('--json', 'Print the organization as JSON')
  .action(async (options: { apiKey?: string; url?: string; json?: boolean }) => {
    const apiKey = options.apiKey ?? process.env.STET_API_KEY;
    if (apiKey === undefined || apiKey === '') {
      console.error('No API key. Pass --api-key or set STET_API_KEY.');
      process.exit(1);
    }

    const origin = resolveOrigin(options.url);
    const client = createStetClient({ origin, apiKey });
    const { data, error, isDefined } = await safe(client.org.current());

    if (isDefined && error.code === 'UNAUTHORIZED') {
      console.error('Invalid or revoked API key.');
      process.exit(1);
    }
    if (error !== null) {
      console.error(error.message !== '' ? error.message : `Could not reach ${origin}.`);
      process.exit(1);
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
