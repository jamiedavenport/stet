import type { z } from 'zod';

export type WebhookEventDefinition<
  TType extends string = string,
  TSchema extends z.ZodType = z.ZodType,
> = {
  // Hierarchical, full-stop-delimited event identifier (Standard Webhooks
  // payload convention), e.g. 'member.joined'.
  type: TType;
  schema: TSchema;
};

export function defineWebhookEvent<TType extends string, TSchema extends z.ZodType>(
  definition: WebhookEventDefinition<TType, TSchema>,
): WebhookEventDefinition<TType, TSchema> {
  return definition;
}
