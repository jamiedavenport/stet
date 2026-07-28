import { useChatAgent } from '@repo/ai/client';
import type { ToolUIPart, UIMessage } from '@repo/ai/client';
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
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@repo/ui/components/ai-elements/prompt-input';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@repo/ui/components/ai-elements/tool';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { brand } from '@repo/brand';
import { createFileRoute, Link } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';

import { useAppRoute } from '#/use-app-route';
import { orgBillingQuery } from '#/organization/functions';

// The agent hook opens a WebSocket, so this route renders client-side only.
export const Route = createFileRoute('/app/chat')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(orgBillingQuery(context.activeOrganization.id)),
  component: ChatPage,
  ssr: false,
});

function ChatPage() {
  const { user, activeOrganization } = useAppRoute();
  const { data: billing } = useSuspenseQuery(orgBillingQuery(activeOrganization.id));
  const organizationName = activeOrganization.name;

  return (
    <Card className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
      <CardHeader>
        <CardTitle>{'Chat'}</CardTitle>
        <CardDescription>
          {`Your assistant in ${organizationName}. Conversations persist across visits.`}
        </CardDescription>
      </CardHeader>
      {/* The AI assistant is a paid feature; the worker enforces the same
          check before routing the agent WebSocket. */}
      {billing.features.ai ? (
        // The worker only routes instance names scoped to the caller's
        // session, so the name must match what the server derives.
        <Chat name={`${activeOrganization.id}:${user.id}`} />
      ) : (
        <UpgradePrompt />
      )}
    </Card>
  );
}

function UpgradePrompt() {
  const brandName = brand.name;
  return (
    <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <LockIcon aria-hidden className="size-6 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{'The AI assistant is a paid feature'}</p>
        <p className="text-sm text-muted-foreground">
          {`Upgrade your organization to chat with the ${brandName} assistant.`}
        </p>
      </div>
      <Button render={<Link to="/app/organization" />}>{'View plans'}</Button>
    </CardContent>
  );
}

function Chat({ name }: { name: string }) {
  const { messages, sendMessage, clearHistory, status } = useChatAgent({ name });
  const brandName = brand.name;

  return (
    <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
      <Conversation aria-label={'Conversation'} className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={'No messages yet'}
              description={`Ask the ${brandName} assistant anything. The conversation is saved to your account.`}
            />
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
          {status === 'submitted' ? <Loader /> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {'Something went wrong. Try sending your message again.'}
        </p>
      ) : null}
      <PromptInput
        onSubmit={(message) => {
          const trimmed = message.text.trim();
          if (trimmed.length === 0) {
            return;
          }
          void sendMessage({ text: trimmed });
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            aria-label={'Message the assistant'}
            placeholder={'Message the assistant'}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearHistory();
              }}
            >
              {'Clear'}
            </Button>
          </PromptInputTools>
          <PromptInputSubmit
            aria-label={'Send'}
            status={status}
            disabled={status === 'submitted' || status === 'streaming'}
          />
        </PromptInputFooter>
      </PromptInput>
    </CardContent>
  );
}

function isToolPart(part: UIMessage['parts'][number]): part is ToolUIPart {
  return part.type.startsWith('tool-');
}

function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return <MessageResponse key={index}>{part.text}</MessageResponse>;
          }
          if (isToolPart(part)) {
            return (
              <Tool key={index}>
                <ToolHeader type={part.type} state={part.state} />
                <ToolContent>
                  {part.input === undefined ? null : <ToolInput input={part.input} />}
                  <ToolOutput output={part.output} errorText={part.errorText} />
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
