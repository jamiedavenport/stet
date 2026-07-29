import { afterEach, describe, expect, it } from 'vite-plus/test';

import { defineStet, DEFAULT_ORIGIN, resolveStetConfig } from './index';

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe('resolveStetConfig', () => {
  it('falls back to the defaults when nothing is set', () => {
    delete process.env.STET_ORIGIN;
    delete process.env.STET_API_KEY;

    expect(resolveStetConfig(undefined)).toEqual({
      origin: DEFAULT_ORIGIN,
      apiKey: undefined,
      output: 'src/stet.gen.ts',
      watch: true,
    });
  });

  it('prefers the environment over the defaults', () => {
    process.env.STET_ORIGIN = 'https://from-env.test';
    process.env.STET_API_KEY = 'key-from-env';

    expect(resolveStetConfig(undefined)).toMatchObject({
      origin: 'https://from-env.test',
      apiKey: 'key-from-env',
    });
  });

  it('prefers the config file over the environment', () => {
    process.env.STET_ORIGIN = 'https://from-env.test';

    const config = defineStet({ origin: 'https://from-file.test', output: 'lib/stet.gen.ts' });
    expect(resolveStetConfig(config)).toMatchObject({
      origin: 'https://from-file.test',
      output: 'lib/stet.gen.ts',
    });
  });

  it('prefers an explicit override over everything', () => {
    process.env.STET_ORIGIN = 'https://from-env.test';

    const config = defineStet({ origin: 'https://from-file.test' });
    expect(resolveStetConfig(config, { origin: 'https://from-flag.test' })).toMatchObject({
      origin: 'https://from-flag.test',
    });
  });

  it('reads a blank environment variable as unset', () => {
    process.env.STET_API_KEY = '';
    expect(resolveStetConfig(undefined).apiKey).toBeUndefined();
  });

  it('keeps watch off when the config turns it off', () => {
    expect(resolveStetConfig(defineStet({ watch: false })).watch).toBe(false);
  });
});

describe('defineStet', () => {
  it('returns the config it was given, so analytics stays non-optional', () => {
    const config = defineStet({ analytics: { events: { signup: { $event: true, props: {} } } } });
    // Typing, not just runtime: a config that declares analytics has no
    // `undefined` to narrow away at the handler and the browser client.
    expect(config.analytics.events.signup).toEqual({ $event: true, props: {} });
  });
});
