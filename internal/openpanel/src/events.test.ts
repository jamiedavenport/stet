import { describe, expect, it } from 'vite-plus/test';

import { registry, subscriptionStarted } from './events';

describe('events registry', () => {
  it('keys every event by its own name', () => {
    for (const [key, definition] of Object.entries(registry)) {
      expect(definition.name).toBe(key);
    }
  });

  it('uses snake_case past-tense names', () => {
    for (const name of Object.keys(registry)) {
      expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it('validates required properties', () => {
    expect(subscriptionStarted.schema.safeParse({}).success).toBe(false);
    expect(subscriptionStarted.schema.safeParse({ plan: 'paid' }).success).toBe(true);
  });

  it('strips unknown properties instead of failing', () => {
    const parsed = subscriptionStarted.schema.parse({ plan: 'paid', stray: true });
    expect(parsed).toEqual({ plan: 'paid' });
  });
});
