import { describe, expect, it, vi } from 'vite-plus/test';

import { clearAnalyticsIdentity, identifyUser, setActiveOrganization, track } from './client';

// initAnalytics never constructs a client outside the browser, so these
// tests exercise the console fallback that local dev and SSR rely on.
describe('client without an OpenPanel client', () => {
  it('logs tracked events to the console', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    track('task_created');
    expect(log).toHaveBeenCalledWith('[analytics] task_created', {});
    log.mockRestore();
  });

  it('requires properties when the schema has them', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // @ts-expect-error subscription_started requires a plan property.
    track('subscription_started');
    track('subscription_started', { plan: 'paid' });
    expect(log).toHaveBeenCalledWith('[analytics] subscription_started', { plan: 'paid' });
    log.mockRestore();
  });

  it('rejects event names outside the registry', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // @ts-expect-error not a registered event name.
    track('made_up_event');
    log.mockRestore();
  });

  it('no-ops identity calls without throwing', () => {
    identifyUser({ id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' });
    setActiveOrganization('org-1');
    clearAnalyticsIdentity();
  });
});
