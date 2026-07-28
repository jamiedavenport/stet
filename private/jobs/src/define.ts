import type { Mailer } from '@repo/mail';
import { z } from 'zod';

/**
 * The slice of the R2 bucket that jobs use. Structural because
 * `@cloudflare/workers-types`' nominal `R2Bucket` does not match the
 * wrangler-generated globals apps/web is typed against.
 */
export type AssetStorage = {
  delete: (keys: string | string[]) => Promise<void>;
  list: (options: {
    prefix?: string;
    cursor?: string;
  }) => Promise<{ objects: Array<{ key: string }>; truncated: boolean; cursor?: string }>;
};

// Shared services handed to every job handler. Built once per batch by the
// queue consumer (see server.ts) so handlers never touch bindings directly.
export type JobContext = {
  mailer: Mailer;
  // Absolute origin of the app, for links in emails.
  baseURL: string;
  storage: AssetStorage;
};

export type JobDefinition<TName extends string = string, TSchema extends z.ZodType = z.ZodType> = {
  name: TName;
  schema: TSchema;
  // Validates an untrusted payload and runs the handler. The closure created
  // by defineJob keeps the schema and handler correlated, so the consumer can
  // dispatch from a heterogeneous registry without casts.
  run: (payload: unknown, context: JobContext) => Promise<void>;
};

export function defineJob<TName extends string, TSchema extends z.ZodType>(definition: {
  name: TName;
  schema: TSchema;
  handle: (payload: z.output<TSchema>, context: JobContext) => Promise<void>;
}): JobDefinition<TName, TSchema> {
  return {
    name: definition.name,
    schema: definition.schema,
    run: async (payload, context) => {
      await definition.handle(definition.schema.parse(payload), context);
    },
  };
}
