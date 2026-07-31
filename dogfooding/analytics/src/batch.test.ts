import { describe, expect, it } from 'vite-plus/test';

import { toIngestBatch } from './batch';

describe('toIngestBatch', () => {
  it('carries identity in the context, not in the props', async () => {
    const batch = await toIngestBatch(
      'subscription.started',
      { plan: 'paid' },
      { userId: 'user_1', organizationId: 'org_1' },
    );

    expect(batch.context).toEqual({ userId: 'user_1', organizationId: 'org_1' });
    expect(batch.events).toHaveLength(1);
    expect(batch.events[0]).toMatchObject({
      name: 'subscription.started',
      props: { plan: 'paid' },
    });
  });

  it('leaves out identity nobody supplied, so it reads as unknown', async () => {
    const batch = await toIngestBatch('signup', {}, {});

    expect(batch.context).toEqual({});
    // Worker events have no reader behind them, so nothing here counts as a
    // visit: the dashboard's unique-visitor figures must not move.
    expect(batch.metadata).toEqual({});
  });

  it('rejects props the plan does not allow', async () => {
    await expect(toIngestBatch('subscription.started', { plan: 42 }, {})).rejects.toThrow(/plan/);
  });

  it('rejects a name that is not in the plan', async () => {
    await expect(toIngestBatch('subscription.renewed', {}, {})).rejects.toThrow(/unknown event/);
  });
});

// Checked by `pnpm tc`, never run: ./server imports `cloudflare:workers`,
// which only resolves inside the Worker runtime. The import stays inside the
// function body so loading this file does not load that module.
async function refusedByTheTrackingPlan(): Promise<void> {
  const { capture } = await import('./server');

  // @ts-expect-error 'subscription.renewed' is not an event in the plan.
  capture('subscription.renewed', {});
  // @ts-expect-error subscription.started declares a required `plan` prop.
  capture('subscription.started', {});
  // @ts-expect-error `plan` is a string, not a number.
  capture('subscription.started', { props: { plan: 1 } });
  // Identity is always optional, and signup declares no props at all.
  capture('signup', { userId: 'user_1' });
}

void refusedByTheTrackingPlan;
