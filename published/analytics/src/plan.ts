import { BUILT_IN_EVENTS, resolveEvent } from './events';
import type { EventsRecord, EventsShape } from './types';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * A tracking plan: every event your product records, and the props each one
 * carries. It is the single source of truth on both sides — the browser
 * client types `track()` from it, the handler validates against it, and
 * `@stetcms/vite` pushes it to Stet so your content team can build dashboards
 * on the same events.
 */
export type AnalyticsPlan<TEvents extends EventsShape = EventsShape> = {
  events: TEvents;
  /** Stet deployment to send to. Defaults to `STET_ORIGIN`, then the cloud. */
  origin?: string;
  /**
   * Organization API key. Server-side only. Defaults to `STET_API_KEY`, which
   * is how the plugin and the CLI read it too, so a plan file stays free of
   * secrets and safe to commit.
   */
  apiKey?: string;
  /** Phantom types read by `createAnalytics<typeof plan>`. No runtime value. */
  $types: { events: EventsRecord<TEvents> };
};

/**
 * Declares the tracking plan, conventionally in `stet.config.ts`:
 *
 * ```ts
 * export default defineAnalytics({
 *   events: {
 *     signup: event({ plan: z.enum(['free', 'paid']) }),
 *     checkout: { completed: event({ total: z.number() }) },
 *   },
 * });
 * ```
 */
export function defineAnalytics<TEvents extends EventsShape>(config: {
  events: TEvents;
  origin?: string;
  apiKey?: string;
}): AnalyticsPlan<TEvents> {
  return {
    ...config,
    $types: undefined as unknown as AnalyticsPlan<TEvents>['$types'],
  };
}

export type ValidatedEvent =
  | { ok: true; props: Record<string, unknown> }
  | { ok: false; issues: readonly StandardSchemaV1.Issue[] };

/**
 * Validates an event's props against the plan. Declared props are checked
 * with their own schema; undeclared props pass through, so adding a prop in
 * the browser never blocks on a deploy of the plan.
 */
export async function validateEvent(
  events: EventsShape,
  name: string,
  props: Record<string, unknown> | undefined,
): Promise<ValidatedEvent> {
  if (BUILT_IN_EVENTS.has(name)) {
    return { ok: true, props: props ?? {} };
  }

  const definition = resolveEvent(events, name);
  if (definition === undefined) {
    return { ok: false, issues: [{ message: `unknown event "${name}"` }] };
  }

  const input = props ?? {};
  const output: Record<string, unknown> = { ...input };
  const issues: StandardSchemaV1.Issue[] = [];

  for (const [key, schema] of Object.entries(definition.props)) {
    let result = schema['~standard'].validate(input[key]);
    if (result instanceof Promise) {
      result = await result;
    }
    if (result.issues) {
      issues.push(
        ...result.issues.map((issue) => ({ ...issue, message: `${key}: ${issue.message}` })),
      );
    } else {
      output[key] = result.value;
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, props: output };
}

export function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues.map((issue) => issue.message).join('; ');
}
