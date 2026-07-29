/**
 * The shape of `stet.config.ts`: everything about a project's Stet
 * integration in one file, read by `@stetcms/vite` and the `stet` CLI so the
 * two never disagree about where your Stet is or what it generates.
 *
 * Deliberately free of relative imports and runtime dependencies: build tools
 * load this module under plain Node, and your app loads it again at runtime
 * to serve the analytics route.
 */

/** The hosted Stet deployment, used when nothing names another one. */
export const DEFAULT_ORIGIN = 'https://stetcms.com';

/**
 * A project's Stet configuration. `TAnalytics` stays opaque so this package
 * never depends on `@stetcms/analytics`: whatever `defineAnalytics()` returns
 * flows straight through to `createAnalytics<typeof config.analytics>`.
 */
export type StetConfig<TAnalytics = unknown> = {
  /**
   * The Stet deployment to generate from and send to. Defaults to
   * `STET_ORIGIN`, then the hosted cloud.
   */
  origin?: string;
  /**
   * Organization API key. Prefer leaving this unset and exporting
   * `STET_API_KEY`: a key in a committed file is a key in your git history.
   */
  apiKey?: string;
  /** Where the generated content client goes, relative to the project root. */
  output?: string;
  /**
   * Regenerate the content client while the dev server runs, so model changes
   * made in the Stet UI reach your types without a restart. On by default.
   */
  watch?: boolean;
  /** The analytics tracking plan, as returned by `defineAnalytics()`. */
  analytics?: TAnalytics;
};

/**
 * Declares a project's Stet configuration, conventionally in
 * `stet.config.ts` at the project root:
 *
 * ```ts
 * import { defineAnalytics, event } from '@stetcms/analytics';
 * import { defineStet } from '@stetcms/config';
 * import { z } from 'zod';
 *
 * export default defineStet({
 *   output: 'src/stet.gen.ts',
 *   analytics: defineAnalytics({
 *     events: { signup: event({ plan: z.enum(['free', 'paid']) }) },
 *   }),
 * });
 * ```
 *
 * Returns exactly what it was given, so a config that declares `analytics`
 * has a non-optional `analytics` at its use sites: the handler and the
 * browser client read it without a null check.
 */
export function defineStet<TConfig extends StetConfig<unknown>>(config: TConfig): TConfig {
  return config;
}

export type StetOverrides = {
  origin?: string;
  apiKey?: string;
  output?: string;
  watch?: boolean;
};

export type ResolvedStetConfig = {
  origin: string;
  /** Undefined when no key is configured, which every caller must tolerate. */
  apiKey: string | undefined;
  output: string;
  watch: boolean;
};

// Declared rather than pulled in from @types/node: this package is loaded in
// Workers and browsers too, and the only Node global it wants is this one.
declare const process: { env: Record<string, string | undefined> } | undefined;

function environment(name: string): string | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }
  const value = process.env[name];
  return value === '' ? undefined : value;
}

/**
 * Settles the config the plugin and the CLI both run on. Precedence is
 * explicit first: a command-line flag or a plugin option beats the config
 * file, which beats the environment, which falls back to the default.
 *
 * Shared so the two tools cannot drift, which is what happens when each
 * writes its own ladder.
 */
export function resolveStetConfig(
  config: StetConfig | undefined,
  overrides: StetOverrides = {},
): ResolvedStetConfig {
  return {
    origin: overrides.origin ?? config?.origin ?? environment('STET_ORIGIN') ?? DEFAULT_ORIGIN,
    apiKey: overrides.apiKey ?? config?.apiKey ?? environment('STET_API_KEY'),
    output: overrides.output ?? config?.output ?? 'src/stet.gen.ts',
    watch: overrides.watch ?? config?.watch ?? true,
  };
}
