import { AIChatAgent } from '@cloudflare/ai-chat';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';

import { chatAgent } from './agents';
import { createChatModel } from './model';
import type { AiEnv } from './model';

// One durable conversation per instance name. Messages persist in the
// Durable Object's SQLite storage and streams resume after disconnects.
// The worker scopes instance names to org + user before routing, so a
// client can never reach a conversation outside its session (see
// apps/web/src/server.ts).
export class ChatAgent extends AIChatAgent<Cloudflare.Env & AiEnv> {
  async onChatMessage(): Promise<Response> {
    const result = streamText({
      model: createChatModel(this.env),
      system: chatAgent.instructions,
      messages: await convertToModelMessages(this.messages),
      tools: chatAgent.tools,
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  }
}
