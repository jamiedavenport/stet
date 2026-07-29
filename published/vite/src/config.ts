/**
 * Loading a project's `stet.config.ts`. Node-only, and kept out of
 * `index.ts` so the CLI can reuse it without pulling in Vite.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EventsShape } from '@stetcms/analytics';
import type { StetConfig } from '@stetcms/config';
import { createJiti } from 'jiti';

/** Paths tried, relative to the project root, when none is given. */
export const CONFIG_CANDIDATES = [
  'stet.config.ts',
  'stet.config.js',
  'stet.config.mjs',
  'src/stet.config.ts',
];

/** Finds a config by trying {@link CONFIG_CANDIDATES} under `root`. */
export function findStetConfig(root: string): string | undefined {
  for (const candidate of CONFIG_CANDIDATES) {
    const absolute = resolve(root, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }
  return undefined;
}

function isStetConfig(value: unknown): value is StetConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  // Every key is optional, so shape alone cannot identify one. Anything
  // carrying a key we know is treated as the config; an empty object is not,
  // which keeps a stray default export from masking the real one.
  return ['origin', 'apiKey', 'output', 'watch', 'analytics'].some((key) => key in value);
}

/**
 * Loads a config file and returns its `defineStet(...)` result, or undefined
 * when the file exports none.
 *
 * Uses jiti so a TypeScript config loads under plain Node whatever the
 * project's own build setup is. `cloudflare:workers` only exists inside
 * workerd, so it resolves to a virtual module whose `env` is `process.env` —
 * the same values Workers expose there on recent compatibility dates.
 */
export async function loadStetConfig(path: string): Promise<StetConfig | undefined> {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    return undefined;
  }

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    virtualModules: { 'cloudflare:workers': { env: process.env } },
  });

  const module = (await jiti.import(absolute)) as Record<string, unknown>;
  // Default export, a named export, or a zero-argument factory returning one:
  // every shape a project might reasonably write.
  for (const exported of Object.values(module)) {
    let value = exported;
    if (typeof value === 'function' && value.length === 0) {
      try {
        value = (value as () => unknown)();
      } catch {
        continue;
      }
    }
    if (value instanceof Promise) {
      try {
        value = await value;
      } catch {
        continue;
      }
    }
    if (isStetConfig(value)) {
      return value;
    }
  }
  return undefined;
}

/**
 * The tracking plan's events, if the config declares any.
 *
 * `StetConfig` keeps `analytics` opaque so `@stetcms/config` never depends on
 * `@stetcms/analytics`; this is where the two meet, and the only place the
 * shape is asserted rather than inferred.
 */
export function trackingPlanEvents(config: StetConfig | undefined): EventsShape | undefined {
  const analytics = config?.analytics as { events?: EventsShape } | undefined;
  return analytics?.events;
}
