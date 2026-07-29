import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

export type AiEnv = {
  ANTHROPIC_API_KEY: string;
};

// The single seam for model selection. Route through an AI gateway or swap
// providers here and every agent picks it up.
export function createChatModel(env: AiEnv): LanguageModel {
  const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return anthropic('claude-sonnet-5');
}

/** For latency-bound work like inline editor rewrites, where a small model
 * answers before a big one has finished thinking. */
export function createFastModel(env: AiEnv): LanguageModel {
  const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return anthropic('claude-haiku-4-5');
}
