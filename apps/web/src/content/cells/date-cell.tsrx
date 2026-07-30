import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@repo/ui/components/button';
import { Calendar } from '@repo/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';

import { dayValue, parseDay } from '#/content/cells/days';

type DateCellProps = {
  /** Accessible name of the cell. */
  label: string;
  value: unknown;
  onSave: (value: string | null) => void;
  onEditingChange: (editing: boolean) => void;
  /** The read view, shown in the cell until it is clicked. */
  children: ReactNode;
};

/** A date cell: the day it holds, picked from a calendar. */
export function DateCell(props: DateCellProps) @{
  const [open, setOpen] = useState(false);
  const selected = parseDay(props.value);

  const setOpenAndSignal = (next: boolean) => {
    setOpen(next);
    props.onEditingChange(next);
  };

  <Popover open={open} onOpenChange={setOpenAndSignal}>
    <PopoverTrigger
      aria-label={props.label}
      className="flex min-h-7 min-w-0 flex-1 items-center rounded-md px-1 text-left hover:bg-muted/60"
    >
      <span className="min-w-0 flex-1 overflow-hidden">{props.children}</span>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0">
      <Calendar
        autoFocus
        mode="single"
        selected={selected}
        defaultMonth={selected}
        onSelect={(day) => {
          props.onSave(day === undefined ? null : dayValue(day));
          setOpenAndSignal(false);
        }}
      />
      @if (selected !== undefined) {
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              props.onSave(null);
              setOpenAndSignal(false);
            }}
          >
            {"Clear"}
          </Button>
        </div>
      }
    </PopoverContent>
  </Popover>
}
