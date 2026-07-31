import { flattenEvents } from '@stetcms/analytics';
import { describe, expect, it } from 'vite-plus/test';

import { analytics } from './plan';

describe('the tracking plan', () => {
  it('flattens to the names the dashboard shows', () => {
    expect(flattenEvents(analytics.events)).toEqual([
      { name: 'signup', props: [] },
      { name: 'organization.created', props: [] },
      { name: 'subscription.started', props: ['plan'] },
      { name: 'subscription.canceled', props: ['plan'] },
    ]);
  });
});

// Checked by `pnpm tc`, never run: ./server imports `cloudflare:workers`,
// which only resolves inside the Worker runtime.
async function refusedByTheTrackingPlan(): Promise<void> {
  const { capture } = await import('./server');

  // @ts-expect-error 'subscription.renewed' is not an event in the plan.
  capture({}, 'subscription.renewed');
  // @ts-expect-error subscription.started declares a required `plan` prop.
  capture({}, 'subscription.started');
  // @ts-expect-error `plan` is a string, not a number.
  capture({}, 'subscription.started', { plan: 1 });

  capture({ userId: 'user_1' }, 'signup');
}

void refusedByTheTrackingPlan;
