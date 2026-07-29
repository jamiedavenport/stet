import { useRef } from 'react';
import { getToolApproval, isStaticToolUIPart, useChatAgent } from '@repo/ai/client';
import { useQueryClient } from '@tanstack/react-query';
import type { ToolUIPart, UIMessage } from '@repo/ai/client';
import { CodeBlock } from '@repo/ui/components/ai-elements/code-block';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@repo/ui/components/ai-elements/conversation';
import { Loader } from '@repo/ui/components/ai-elements/loader';
import { Message, MessageContent, MessageResponse } from '@repo/ui/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@repo/ui/components/ai-elements/prompt-input';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@repo/ui/components/ai-elements/tool';
import { SparklesIcon, SquarePenIcon, XIcon } from 'lucide-react';

import { useAssistant } from '#/ai/assistant-context.tsrx';
import type { AssistantLocation } from '#/ai/location';

/** How each tool call reads in the transcript and on approval cards. */
const toolLabels: Record<string, string> = {
  getContentModel: 'Read the content model',
  listEntries: 'List entries',
  getEntry: 'Read an entry',
  searchContent: 'Search content',
  createContentType: 'Create a collection or map',
  updateContentType: 'Rename a collection or map',
  deleteContentType: 'Delete a collection or map',
  addField: 'Add a field',
  deleteField: 'Delete a field',
  createEntry: 'Create an entry',
  updateEntry: 'Update an entry',
  deleteEntry: 'Delete an entry',
};

function toolLabel(part: ToolUIPart): string {
  const name = part.type.slice('tool-'.length);
  return toolLabels[name] ?? name;
}

const suggestions: Record<AssistantLocation['kind'], string[]> = {
  home: [
    'What is in the content model?',
    'Create a collection for blog posts',
    'Search the content for…',
  ],
  collection: ['What is in this collection?', 'Create a new entry', 'Add a field'],
  entry: [
    'Summarize this entry',
    'Review this entry for tone and clarity',
    'Suggest a better title',
  ],
  map: ['What does this map hold?', 'Suggest fields it may be missing'],
  page: ['What is in the content model?', 'Search the content for…'],
};

type RespondFn = (id: string, approved: boolean) => void;

/**
 * The conversation with the org/user-scoped ChatAgent. Every message carries
 * the current location so "summarize this" needs no explanation, and
 * mutating tool calls pause on an approval card until the user answers.
 */
export function AssistantChat({ name, location }: { name: string; location: AssistantLocation }) {
  // Read through a ref so the body callback always reports the page the user
  // is on when the message is sent, not when the hook mounted.
  const prompt = useRef(location.prompt);
  prompt.current = location.prompt;

  const queryClient = useQueryClient();
  const { messages, sendMessage, status, stop, clearHistory, addToolApprovalResponse } =
    useChatAgent({
      name,
      body: () => ({ location: prompt.current }),
      // The agent may have changed the model or entries server-side; refetch
      // whatever content the open pages render. Read-only turns pay one cheap
      // requery per mounted content query.
      onFinish: () => {
        for (const key of ['content-model', 'content-entries', 'content-entry', 'content-map']) {
          void queryClient.invalidateQueries({ queryKey: [key] });
        }
      },
    });
  const { setOpen } = useAssistant();

  const busy = status === 'submitted' || status === 'streaming';
  const send = (text: string) => {
    if (text.trim().length > 0) {
      void sendMessage({ text });
    }
  };
  const respond: RespondFn = (id, approved) => {
    addToolApprovalResponse({ id, approved });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <SparklesIcon className="size-4" />
        <span className="text-sm font-medium">Assistant</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="New conversation"
            onClick={() => clearHistory()}
          >
            <SquarePenIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Close assistant"
            onClick={() => setOpen(false)}
          >
            <XIcon />
          </Button>
        </div>
      </div>
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState icon={<SparklesIcon className="size-8" />} title="Ask anything">
              <SparklesIcon className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Ask anything</h3>
                <p className="text-sm text-muted-foreground">
                  The assistant sees what you see and asks before changing anything.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2">
                {suggestions[location.kind].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <MessageView key={message.id} message={message} respond={respond} />
            ))
          )}
          {status === 'submitted' ? <Loader /> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 border-t p-3">
        <PromptInput onSubmit={({ text }) => send(text)}>
          <PromptInputTextarea placeholder="Ask the assistant…" className="min-h-12" />
          <PromptInputFooter>
            <span className="truncate text-xs text-muted-foreground">
              Looking at: {location.label}
            </span>
            {busy ? (
              <PromptInputSubmit status={status} type="button" onClick={() => void stop()} />
            ) : (
              <PromptInputSubmit status={status} />
            )}
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function MessageView({ message, respond }: { message: UIMessage; respond: RespondFn }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => {
          const key = `${message.id}-${index}`;
          if (part.type === 'text') {
            return <MessageResponse key={key}>{part.text}</MessageResponse>;
          }
          if (isStaticToolUIPart(part)) {
            if (part.state === 'approval-requested') {
              return <ApprovalCard key={key} part={part} respond={respond} />;
            }
            return (
              <Tool key={key}>
                <ToolHeader type={part.type} state={part.state} title={toolLabel(part)} />
                <ToolContent>
                  <ToolInput input={part.input} />
                  <ToolOutput
                    output={part.state === 'output-available' ? part.output : undefined}
                    errorText={part.state === 'output-error' ? part.errorText : undefined}
                  />
                </ToolContent>
              </Tool>
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

function ApprovalCard({ part, respond }: { part: ToolUIPart; respond: RespondFn }) {
  const approval = getToolApproval(part);
  if (approval === undefined) {
    return null;
  }
  return (
    <div className="not-prose mb-4 w-full rounded-md border">
      <div className="flex items-center gap-2 p-3">
        <SparklesIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{toolLabel(part)}</span>
        <Badge className="rounded-full text-xs" variant="secondary">
          Needs approval
        </Badge>
      </div>
      <div className="overflow-hidden px-3 pb-3">
        <div className="rounded-md bg-muted/50">
          <CodeBlock code={JSON.stringify(part.input, null, 2)} language="json" />
        </div>
      </div>
      <div className="flex gap-2 border-t p-3">
        <Button size="sm" onClick={() => respond(approval.id, true)}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => respond(approval.id, false)}>
          Reject
        </Button>
      </div>
    </div>
  );
}
