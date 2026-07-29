import { AIChatAgent } from '@cloudflare/ai-chat';
import type { OnChatMessageOptions } from '@cloudflare/ai-chat';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import type { StreamTextOnFinishCallback, ToolSet } from 'ai';

import { instructions, locationFrom } from './instructions';
import { createChatModel } from './model';
import type { AiEnv } from './model';
import { contentTools } from './tools/index';

// One durable conversation per instance name. Messages persist in the
// Durable Object's SQLite storage and streams resume after disconnects.
// The worker scopes instance names to `organizationId:userId` before routing,
// so a client can never reach a conversation outside its session (see
// apps/web/src/server.ts) — and that name is what scopes every tool call.
export class ChatAgent extends AIChatAgent<Cloudflare.Env & AiEnv> {
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: OnChatMessageOptions,
  ): Promise<Response> {
    const tools = contentTools(this.organizationId());
    const result = streamText({
      model: createChatModel(this.env),
      system: instructions(locationFrom(options)),
      messages: await convertToModelMessages(this.messages, { tools }),
      // Tools marked needsApproval pause the stream on an approval card in
      // the chat; the client hook resumes the turn with the verdict.
      tools,
      stopWhen: stepCountIs(10),
      onFinish,
    });

    return result.toUIMessageStreamResponse();
  }

  private organizationId(): string {
    const separator = this.name.indexOf(':');
    if (separator <= 0) {
      throw new Error(`Agent ${this.name} is not named "organizationId:userId".`);
    }
    return this.name.slice(0, separator);
  }
}
