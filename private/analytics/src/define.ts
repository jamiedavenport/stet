import type { z } from 'zod';

/**
 * One analytics event the product can record. The schema is the contract for
 * the event's properties: both the browser `track()` and the Worker
 * `capture()` derive their property types from it, so a call site can only
 * drift from the tracking plan by failing to compile.
 */
export type EventDefinition<
  TName extends string = string,
  TSchema extends z.ZodType = z.ZodType,
> = {
  name: TName;
  schema: TSchema;
};

/**
 * Declares an analytics event for the registry in events.ts. Names are
 * snake_case and past tense (`organization_created`), matching how they appear in
 * OpenPanel.
 */
export function defineEvent<TName extends string, TSchema extends z.ZodType>(definition: {
  name: TName;
  schema: TSchema;
}): EventDefinition<TName, TSchema> {
  return definition;
}
