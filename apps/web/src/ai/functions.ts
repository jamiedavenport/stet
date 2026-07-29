import { createFastModel } from '@repo/ai/model';
import { ai } from '@repo/billing/server';
import { createServerFn } from '@tanstack/react-start';
import { generateText } from 'ai';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

import { organizationMiddleware } from '#/session';

/**
 * Rewrites an editor selection. Small model, one shot: the result lands as
 * a single undoable replacement, so latency matters more than brilliance.
 */
export const transformText = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({ instruction: z.string().min(1).max(500), text: z.string().min(1).max(8000) }),
  )
  .handler(async ({ data, context }) => {
    // Same plan gate as the chat agent; the editor hides the entry point
    // when the feature is off, this enforces it.
    await ai.require(context.organizationId);
    const result = await generateText({
      model: createFastModel(env),
      system:
        'You rewrite selections from a rich text editor. Return only the replacement, as plain ' +
        'markdown: no preamble, no quotes around the answer, no code fences. Match the original ' +
        'language, and keep formatting only where the original had it.',
      prompt: `${data.instruction}\n\n<selection>\n${data.text}\n</selection>`,
    });
    return { text: result.text.trim() };
  });
