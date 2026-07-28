import { brand } from '@repo/brand';
import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';

export type AgentDefinition = {
  id: string;
  instructions: string;
  tools: ToolSet;
};

// Agent definitions are plain data consumed by the ChatAgent Durable Object
// (see server.ts). Adding an agent means adding a definition here and a
// binding for it in the worker.
export const chatAgent = {
  id: 'chat',
  instructions:
    `You are the ${brand.name} assistant, a helpful agent inside the ${brand.name} app. ` +
    'Keep answers short and friendly. Use your tools when they help.',
  tools: {
    getCurrentTime: tool({
      description: 'Get the current date and time in UTC.',
      inputSchema: z.object({}),
      execute: async () => {
        return { now: new Date().toISOString() };
      },
    }),
  },
} satisfies AgentDefinition;
