import type { EventDefinition, EventsShape, PropsShape } from './types';

/** The pageview every browser client sends. */
export const PAGEVIEW = '$pageview';

/**
 * Events the client sends for itself. `$`-prefixed so a tracking plan can
 * never collide with one; their context (url, referrer) rides the envelope
 * rather than the props, so they carry no schema of their own.
 */
export const BUILT_IN_EVENTS: ReadonlySet<string> = new Set([PAGEVIEW]);

/**
 * Declares an event and the props it carries. Props are any Standard Schema
 * validator, so the schema library is yours to pick (Zod, Valibot, ArkType).
 * Events group by nesting, and nested events track under dot-joined names:
 *
 * ```ts
 * events: {
 *   signup: event({ plan: z.enum(['free', 'paid']) }),
 *   checkout: { started: event(), completed: event({ total: z.number() }) },
 * }
 * // → 'signup', 'checkout.started', 'checkout.completed'
 * ```
 */
export function event<TProps extends PropsShape = Record<never, never>>(
  props?: TProps,
): EventDefinition<TProps> {
  return { $event: true, props: props ?? ({} as TProps) };
}

export function isEventDefinition(value: unknown): value is EventDefinition {
  return (
    typeof value === 'object' && value !== null && (value as { $event?: unknown }).$event === true
  );
}

/** Walks a dot-joined name (`checkout.completed`) to its definition. */
export function resolveEvent(events: EventsShape, name: string): EventDefinition | undefined {
  let node: EventDefinition | EventsShape = events;
  for (const part of name.split('.')) {
    if (isEventDefinition(node)) {
      return undefined;
    }
    const next: EventDefinition | EventsShape | undefined = node[part];
    if (next === undefined) {
      return undefined;
    }
    node = next;
  }
  return isEventDefinition(node) ? node : undefined;
}

/** Flattens a nested plan to `[{ name: 'checkout.completed', props: ['total'] }]`. */
export function flattenEvents(
  events: EventsShape,
  prefix = '',
): { name: string; props: string[] }[] {
  const flat: { name: string; props: string[] }[] = [];
  for (const [key, value] of Object.entries(events)) {
    const name = prefix === '' ? key : `${prefix}.${key}`;
    if (isEventDefinition(value)) {
      flat.push({ name, props: Object.keys(value.props) });
    } else {
      flat.push(...flattenEvents(value, name));
    }
  }
  return flat;
}
