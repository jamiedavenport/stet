import type { z } from 'zod';

// A workflow's declaration: params schema plus the wrangler wiring (binding
// and class name), which apps/web/vite.config.ts reads to generate the
// `workflows` worker config. Definitions live next to their class in
// src/workflows/<name>/ but in a separate file, because this side must stay
// importable from Node (the vite config) while the class imports
// `cloudflare:workers`.
export type WorkflowDefinition<
  TName extends string = string,
  TSchema extends z.ZodType = z.ZodType,
> = {
  name: TName;
  binding: string;
  className: string;
  schema: TSchema;
};

export function defineWorkflow<TName extends string, TSchema extends z.ZodType>(
  definition: WorkflowDefinition<TName, TSchema>,
): WorkflowDefinition<TName, TSchema> {
  return definition;
}
