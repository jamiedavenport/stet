import { useAgentChat } from '@cloudflare/ai-chat/react';
import { useAgent } from 'agents/react';
import type { ChatOnFinishCallback, UIMessage } from 'ai';

export {
  getToolApproval,
  getToolInput,
  getToolOutput,
  getToolPartState,
} from '@cloudflare/ai-chat/react';
export { isStaticToolUIPart } from 'ai';
export type { ToolUIPart, UIMessage } from 'ai';

export type UseChatAgentOptions = {
  // Conversation instance name; must match the org/user scope the worker
  // derives from the session or the connection is rejected.
  name: string;
  /**
   * Extra fields for every request body. The server reads them off
   * `options.body` in `onChatMessage`, which is how the client tells the
   * agent where in the app the user is standing.
   */
  body?: Record<string, unknown> | (() => Record<string, unknown>);
  /** Called when an assistant turn finishes, tool continuations included. */
  onFinish?: ChatOnFinishCallback<UIMessage>;
};

// Connects to the ChatAgent Durable Object over WebSocket. Messages are
// loaded from the agent's storage on mount and streams resume when the
// client reconnects mid-response.
export function useChatAgent({ name, body, onFinish }: UseChatAgentOptions) {
  const agent = useAgent({ agent: 'chat-agent', name });
  return useAgentChat({ agent, resume: true, body, onFinish });
}
