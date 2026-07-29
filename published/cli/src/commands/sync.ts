import { syncTrackingPlan } from '@stetcms/analytics/sync';
import { Command } from 'commander';

import { settleOptions } from '#/config';
import * as ui from '#/ui';

export const syncCommand = new Command('sync')
  .description('Publish your analytics tracking plan so Stet can chart its events')
  .option('--url <origin>', 'Stet server origin (defaults to $STET_ORIGIN or the hosted app)')
  .option('--key <api-key>', 'Organization API key (defaults to $STET_API_KEY)')
  .option('--config <path>', 'Path to stet.config.ts (auto-detected by default)')
  .action(async (options: { url?: string; key?: string; config?: string }) => {
    ui.begin('stet sync');

    const { origin, apiKey, events } = await settleOptions(options);
    if (apiKey === undefined) {
      ui.fail('No API key. Pass --key or set STET_API_KEY.');
    }
    if (events === undefined) {
      ui.fail('No tracking plan found. Add `analytics` to stet.config.ts.');
    }

    const syncing = ui.progress();
    syncing.start(`Publishing the tracking plan to ${origin}…`);
    try {
      const { synced } = await syncTrackingPlan({ events, origin, apiKey });
      syncing.stop(`Published ${synced} ${synced === 1 ? 'event' : 'events'}`);
    } catch (error) {
      syncing.stop('Could not publish the plan');
      ui.fail(String(error));
    }

    ui.done('Tracking plan is live');
  });
