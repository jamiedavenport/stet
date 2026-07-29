'use client';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '../input-group';
import { cn } from '../../lib/utils';
import type { ChatStatus } from 'ai';
import { CornerDownLeftIcon, Loader2Icon, SquareIcon, XIcon } from 'lucide-react';
import {
  type ComponentProps,
  type FormEvent,
  type FormEventHandler,
  type HTMLAttributes,
  type KeyboardEventHandler,
  useState,
} from 'react';

type PromptInputMessage = {
  text: string;
};

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

export const PromptInput = ({ className, onSubmit, children, ...props }: PromptInputProps) => {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = (new FormData(form).get('message') as string) || '';
    // Reset before the handler runs so input typed during an async submit is kept.
    form.reset();
    void onSubmit({ text }, event);
  };

  return (
    <form className={cn('w-full', className)} onSubmit={handleSubmit} {...props}>
      <InputGroup className="overflow-hidden">{children}</InputGroup>
    </form>
  );
};

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>;

export const PromptInputTextarea = ({
  className,
  placeholder = 'What would you like to know?',
  ...props
}: PromptInputTextareaProps) => {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key !== 'Enter') {
      return;
    }
    if (isComposing || e.nativeEvent.isComposing || e.shiftKey) {
      return;
    }
    e.preventDefault();

    // Respect a disabled submit button (e.g. while streaming).
    const form = e.currentTarget.form;
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitButton?.disabled) {
      return;
    }

    form?.requestSubmit();
  };

  return (
    <InputGroupTextarea
      className={cn('field-sizing-content max-h-48 min-h-16', className)}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
};

export type PromptInputFooterProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>;

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn('justify-between gap-1', className)}
    {...props}
  />
);

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
};

export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon-sm',
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let Icon = <CornerDownLeftIcon className="size-4" />;

  if (status === 'submitted') {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    Icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    Icon = <XIcon className="size-4" />;
  }

  return (
    <InputGroupButton
      aria-label="Submit"
      className={cn(className)}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </InputGroupButton>
  );
};
