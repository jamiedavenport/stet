import type { StandardSchemaV1 } from '@standard-schema/spec';

export type PropsShape = Record<string, StandardSchemaV1>;

export type EventDefinition<TProps extends PropsShape = PropsShape> = {
  $event: true;
  props: TProps;
};

/** Events nest into groups: `{ checkout: { started: event() } }`. */
export type EventsShape = {
  [name: string]: EventDefinition | EventsShape;
};

type Pretty<T> = { [K in keyof T]: T[K] } & {};

type RawProps<T extends PropsShape> = {
  [K in keyof T]: StandardSchemaV1.InferInput<T[K]>;
};

type UndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/** A props shape as its call site writes it: schemas accepting `undefined` become optional. */
export type InferProps<T extends PropsShape> = Pretty<
  Partial<Pick<RawProps<T>, UndefinedKeys<RawProps<T>>>> &
    Omit<RawProps<T>, UndefinedKeys<RawProps<T>>>
>;

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

type FlatEventProps<T extends EventsShape, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends EventDefinition<infer TProps>
    ? Record<Join<P, K>, InferProps<TProps>>
    : T[K] extends EventsShape
      ? FlatEventProps<T[K], Join<P, K>>
      : never;
}[keyof T & string];

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

/** A nested plan flattened to dot-joined names: `{ 'checkout.started': {...} }`. */
export type EventsRecord<T extends EventsShape> = Pretty<UnionToIntersection<FlatEventProps<T>>>;

/**
 * The argument tuple for `track(name, ...)`. Props stay optional while every
 * one of them is, so an event carrying no props tracks with a bare name.
 */
export type TrackArgs<TProps> = Partial<TProps> extends TProps ? [props?: TProps] : [props: TProps];

/**
 * The structural contract between a tracking plan and the browser client:
 * `createAnalytics<typeof plan>` reads only the phantom `$types`, so nothing
 * in the plan's module graph (schemas, secrets) has to reach the browser.
 */
export type AnalyticsTypes = {
  $types: {
    events: Record<string, Record<string, unknown>>;
  };
};
