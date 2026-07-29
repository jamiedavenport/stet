import { useState } from 'react';
import type { PageRoom } from '@repo/realtime/client';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Input } from '@repo/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';

import { useCellWatchers } from '#/content/presence';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

type MetaCellProps = {
  value: string;
  /** Accessible name for the cell and prefix for its input, e.g. `Title`. */
  label: string;
  mono?: boolean;
  room: PageRoom | null;
  entryId: string;
  /**
   * Presence key for this cell. Field keys are slugified, so a `$` prefix
   * (`$title`, `$slug`) can never collide with one.
   */
  cellKey: string;
  onSave: (value: string) => Promise<void>;
  onEditingChange: (editing: boolean) => void;
};

/**
 * An inline editor for an entry's own columns (title, slug), which are not
 * fields but edit like them. Empty input is a no-op: entries always keep a
 * title and a slug.
 */
export function MetaCell(props: MetaCellProps) @{
  const watchers = useCellWatchers(props.room, props.entryId, props.cellKey);
  const [open, setOpen] = useState(false);

  const setOpenAndSignal = (next: boolean) => {
    setOpen(next);
    props.onEditingChange(next);
  };

  const commit = (raw: string) => {
    const value = raw.trim();
    if (value !== '' && value !== props.value) {
      void props.onSave(value);
    }
  };

  <Popover open={open} onOpenChange={setOpenAndSignal}>
    <PopoverTrigger
      aria-label={props.label}
      className="flex min-h-7 w-full items-center gap-1 rounded-md px-1 text-left hover:bg-muted/60"
    >
      <span
        className={
          props.mono === true
            ? 'flex-1 truncate font-mono text-xs text-muted-foreground'
            : 'flex-1 truncate text-sm font-medium'
        }
      >
        {props.value}
      </span>
      @if (watchers.length > 0) {
        <span className="flex shrink-0 items-center -space-x-1">
          @for (const watcher of watchers; key watcher.id) {
            <span title={`${watcher.name} is editing`}>
              <Avatar size="sm" className="size-4 ring-2 ring-primary">
                <AvatarImage src={imageSrc(watcher.image, 64)} />
                <AvatarFallback className="text-[8px]">{initials(watcher.name)}</AvatarFallback>
              </Avatar>
            </span>
          }
        </span>
      }
    </PopoverTrigger>
    <PopoverContent align="start" className="w-64 p-2">
      <Input
        autoFocus
        defaultValue={props.value}
        aria-label={`${props.label} value`}
        className={props.mono === true ? 'font-mono text-xs' : undefined}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(event.currentTarget.value);
            setOpenAndSignal(false);
          }
        }}
      />
    </PopoverContent>
  </Popover>
}
