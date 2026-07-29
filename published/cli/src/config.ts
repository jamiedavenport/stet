import { resolve } from 'node:path';
import type { EventsShape } from '@stetcms/analytics';
import { resolveStetConfig } from '@stetcms/config';
import type { ResolvedStetConfig } from '@stetcms/config';
import { findStetConfig, loadStetConfig, trackingPlanEvents } from '@stetcms/vite/config';

export type CommandOptions = {
  url?: string;
  key?: string;
  output?: string;
  config?: string;
};

export type Settled = ResolvedStetConfig & {
  /** The tracking plan's events, if `stet.config.ts` declares any. */
  events: EventsShape | undefined;
};

/**
 * Settles a command's options against `stet.config.ts` the same way
 * `@stetcms/vite` does, so the plugin and the CLI can never disagree about
 * which Stet a project talks to.
 */
export async function settleOptions(options: CommandOptions): Promise<Settled> {
  const path =
    options.config === undefined
      ? findStetConfig(process.cwd())
      : resolve(process.cwd(), options.config);
  const file = path === undefined ? undefined : await loadStetConfig(path);

  return {
    ...resolveStetConfig(file, {
      origin: options.url,
      apiKey: options.key,
      output: options.output,
    }),
    events: trackingPlanEvents(file),
  };
}
