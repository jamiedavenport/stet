import { describe, expect, it } from 'vite-plus/test';
import { z } from 'zod';

import { event, flattenEvents, resolveEvent } from './events';
import { defineAnalytics, validateEvent } from './plan';

const plan = defineAnalytics({
  events: {
    signup: event({ plan: z.enum(['free', 'paid']) }),
    checkout: {
      started: event(),
      completed: event({ total: z.number(), coupon: z.string().optional() }),
    },
  },
});

describe('tracking plan', () => {
  it('resolves nested events by dot name', () => {
    expect(resolveEvent(plan.events, 'checkout.completed')).toBeDefined();
    expect(resolveEvent(plan.events, 'checkout')).toBeUndefined();
    expect(resolveEvent(plan.events, 'signup.nope')).toBeUndefined();
  });

  it('flattens to the names and props the dashboard is built on', () => {
    expect(flattenEvents(plan.events)).toEqual([
      { name: 'signup', props: ['plan'] },
      { name: 'checkout.started', props: [] },
      { name: 'checkout.completed', props: ['total', 'coupon'] },
    ]);
  });
});

describe('validateEvent', () => {
  it('accepts declared props and returns the parsed values', async () => {
    const result = await validateEvent(plan.events, 'signup', { plan: 'paid' });
    expect(result).toEqual({ ok: true, props: { plan: 'paid' } });
  });

  it('rejects an unknown event', async () => {
    const result = await validateEvent(plan.events, 'nope', {});
    expect(result.ok).toBe(false);
  });

  it('names the offending prop when validation fails', async () => {
    const result = await validateEvent(plan.events, 'checkout.completed', { total: 'lots' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.message).toContain('total:');
    }
  });

  it('lets undeclared props through so the browser can add one first', async () => {
    const result = await validateEvent(plan.events, 'checkout.started', { source: 'nav' });
    expect(result).toEqual({ ok: true, props: { source: 'nav' } });
  });

  it('exempts built-in events from the plan', async () => {
    const result = await validateEvent(plan.events, '$pageview', {});
    expect(result.ok).toBe(true);
  });

  it('types track() from the plan', () => {
    type Events = (typeof plan)['$types']['events'];
    const total: Events['checkout.completed']['total'] = 42;
    expect(total).toBe(42);
    // @ts-expect-error 'plan' only accepts the enum's members.
    const bad: Events['signup']['plan'] = 'enterprise';
    expect(bad).toBe('enterprise');
  });
});
