import * as React from 'react';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog } from '@base-ui/react/dialog';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

import { cn } from '../lib/utils';

// Carries the input's ref from the dialog, which needs it to place initial
// focus, down to the input itself, which the caller renders.
const CommandInputRef = React.createContext<React.RefObject<HTMLInputElement | null> | null>(null);

/**
 * A command palette: Base UI's Dialog wrapped around an Autocomplete held
 * permanently open, which is the composition its own command-palette demo
 * uses. Pages, actions and result loading belong to the caller; these parts
 * only carry the styling.
 */
function CommandDialog({
  children,
  className,
  title,
  ...props
}: Omit<Dialog.Root.Props, 'children'> & {
  className?: string;
  title: string;
  children?: React.ReactNode;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Dialog.Root {...props}>
      <Dialog.Portal>
        <Dialog.Backdrop
          data-slot="command-backdrop"
          className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
        />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <Dialog.Popup
            data-slot="command-dialog"
            // Named explicitly: the default lands focus on the popup, leaving
            // the first keystroke with nowhere to go.
            initialFocus={inputRef}
            className={cn(
              'flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
              className,
            )}
          >
            {/* The visible label is the input's placeholder, which changes per page. */}
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            <CommandInputRef.Provider value={inputRef}>{children}</CommandInputRef.Provider>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Holds the list open and unfiltered; the caller decides what `items` are. */
function Command({ ...props }: Autocomplete.Root.Props<unknown>) {
  return (
    <Autocomplete.Root open inline autoHighlight="always" keepHighlight filter={null} {...props} />
  );
}

function CommandInput({ className, ...props }: Autocomplete.Input.Props) {
  const inputRef = React.useContext(CommandInputRef);

  return (
    <div className="flex items-center gap-2 border-b px-3" data-slot="command-input-wrapper">
      <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" />
      <Autocomplete.Input
        ref={inputRef}
        data-slot="command-input"
        className={cn(
          'h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: Autocomplete.List.Props) {
  return (
    <Autocomplete.List
      data-slot="command-list"
      className={cn('max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain p-1', className)}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: Autocomplete.Empty.Props) {
  return (
    <Autocomplete.Empty
      data-slot="command-empty"
      className={cn(
        'py-6 text-center text-sm text-muted-foreground empty:hidden empty:py-0',
        className,
      )}
      {...props}
    />
  );
}

function CommandGroup({ ...props }: Autocomplete.Group.Props) {
  return <Autocomplete.Group data-slot="command-group" {...props} />;
}

function CommandGroupLabel({ className, ...props }: Autocomplete.GroupLabel.Props) {
  return (
    <Autocomplete.GroupLabel
      data-slot="command-group-label"
      className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: Autocomplete.Item.Props) {
  return (
    <Autocomplete.Item
      data-slot="command-item"
      className={cn(
        'flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** Right-aligned key hint, e.g. the `G` of a `G then S` binding. */
function CommandShortcut({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="command-shortcut"
      className={cn(
        'ml-auto flex gap-1 font-sans text-xs tracking-widest text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a group's items. Required rather than cosmetic: it is what registers
 * each item's index with the list, and Enter activates the highlighted item by
 * clicking the node it finds at that index.
 */
const CommandCollection = Autocomplete.Collection;

/**
 * Locale-aware substring matching, for the items filtered in the browser.
 * `filter={null}` above turns off the built-in pass, because server results
 * arrive already matched and must not be filtered twice.
 */
const useCommandFilter = Autocomplete.useFilter;

export {
  Command,
  CommandCollection,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  useCommandFilter,
};
