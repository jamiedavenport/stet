import { useAgentChat } from '@cloudflare/ai-chat/react';
import { useAgent } from 'agents/react';

export type { ToolUIPart, UIMessage } from 'ai';

export type UseChatAgentOptions = {
  // Conversation instance name; must match the org/user scope the worker
  // derives from the session or the connection is rejected.
  name: string;
};

// Connects to the ChatAgent Durable Object over WebSocket. Messages are
// loaded from the agent's storage on mount and streams resume when the
// client reconnects mid-response.
export function useChatAgent({ name }: UseChatAgentOptions) {
  const agent = useAgent({ agent: 'chat-agent', name });
  return useAgentChat({ agent, resume: true });
}
