import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react';

import { fieldTypeLabels, fieldTypes, nextOptionColor, optionColors } from '#/content/field/schema';
import type { FieldType, SelectOption } from '#/content/field/schema';
import { createField, deleteField, moveField, updateField } from '#/content/field/functions';
import type { ModelField } from '#/content/model/functions';
import { optionDotClasses } from '#/content/field/option-colors';

type FieldHeaderProps = {
  field: ModelField;
  /** Whether the field renders as a table column or a map row. */
  orientation?: 'column' | 'row';
  onChanged: () => Promise<void>;
};

/** A field's name, opening its settings: rename, options, move, delete. */
export function FieldHeader({ field, orientation = 'column', onChanged }: FieldHeaderProps) @{
  const [name, setName] = useState(field.name);
  const options = field.config.options ?? [];
  const hasOptions = field.type === 'select' || field.type === 'multi_select';

  const rename = async () => {
    if (name.trim().length === 0 || name.trim() === field.name) {
      return;
    }
    await updateField({ data: { id: field.id, name: name.trim() } });
    await onChanged();
  };

  const saveOptions = async (next: SelectOption[]) => {
    await updateField({ data: { id: field.id, config: { options: next } } });
    await onChanged();
  };

  const move = async (direction: 'left' | 'right') => {
    await moveField({ data: { id: field.id, direction } });
    await onChanged();
  };

  const remove = async () => {
    await deleteField({ data: { id: field.id } });
    await onChanged();
  };

  <Popover>
    <PopoverTrigger className="flex items-center gap-1 rounded-md px-1 font-medium hover:bg-muted/60">
      {field.name}
    </PopoverTrigger>
    <PopoverContent align="start" className="flex w-64 flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          aria-label={"Field name"}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void rename()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void rename();
            }
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {`${fieldTypeLabels[field.type]} · `}
        <code>{field.key}</code>
      </p>
      @if (hasOptions) {
        <OptionsEditor options={options} onSave={saveOptions} />
      }
      <div className="flex items-center gap-1 border-t pt-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={orientation === 'row' ? 'Move up' : 'Move left'}
          onClick={() => void move('left')}
        >
          @if (orientation === 'row') {
            <ChevronUpIcon className="size-4" />
          }
          @if (orientation === 'column') {
            <ChevronLeftIcon className="size-4" />
          }
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={orientation === 'row' ? 'Move down' : 'Move right'}
          onClick={() => void move('right')}
        >
          @if (orientation === 'row') {
            <ChevronDownIcon className="size-4" />
          }
          @if (orientation === 'column') {
            <ChevronRightIcon className="size-4" />
          }
        </Button>
        <Button variant="destructive" size="sm" className="ml-auto" onClick={() => void remove()}>
          {"Delete field"}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
}

/** Select options: rename inline, recolor by clicking the dot, add, remove. */
function OptionsEditor({
  options,
  onSave,
}: {
  options: SelectOption[];
  onSave: (next: SelectOption[]) => Promise<void>;
}) @{
  const [draft, setDraft] = useState('');

  const add = async () => {
    const name = draft.trim();
    if (name.length === 0) {
      return;
    }
    setDraft('');
    await onSave([
      ...options,
      { id: crypto.randomUUID(), name, color: nextOptionColor(options) },
    ]);
  };

  const recolor = async (option: SelectOption) => {
    const next = optionColors[(optionColors.indexOf(option.color) + 1) % optionColors.length];
    await onSave(options.map((o) => (o.id === option.id ? { ...o, color: next } : o)));
  };

  const renameOption = async (option: SelectOption, value: string) => {
    if (value.trim().length === 0 || value.trim() === option.name) {
      return;
    }
    await onSave(options.map((o) => (o.id === option.id ? { ...o, name: value.trim() } : o)));
  };

  <div className="flex flex-col gap-1">
    @for (const option of options; key option.id) {
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Change color of ${option.name}`}
          className="flex size-5 items-center justify-center rounded-md hover:bg-muted"
          onClick={() => void recolor(option)}
        >
          <span aria-hidden="true" className={`size-2.5 rounded-full ${optionDotClasses[option.color]}`} />
        </button>
        <Input
          defaultValue={option.name}
          aria-label={`Rename ${option.name}`}
          className="h-7"
          onBlur={(event) => void renameOption(option, event.target.value)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${option.name}`}
          onClick={() => void onSave(options.filter((o) => o.id !== option.id))}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>
    }
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <Input
        value={draft}
        placeholder={"Add an option…"}
        aria-label={"New option name"}
        className="h-7"
        onChange={(event) => setDraft(event.target.value)}
      />
    </form>
  </div>
}

type AddFieldProps = {
  typeId: string;
  /** Text next to the plus; without it the trigger is the bare icon. */
  label?: string;
  onCreated: () => Promise<void>;
};

/** The "add a field" trigger: name a field and pick its type. */
export function AddField({ typeId, label, onCreated }: AddFieldProps) @{
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const create = async (type: FieldType) => {
    if (name.trim().length === 0) {
      return;
    }
    await createField({ data: { typeId, name: name.trim(), type } });
    setName('');
    setOpen(false);
    await onCreated();
  };

  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger
      aria-label={"Add a field"}
      className={
        label === undefined
          ? 'flex size-6 items-center justify-center rounded-md hover:bg-muted'
          : 'flex h-7 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground'
      }
    >
      <PlusIcon className="size-4" />
      @if (label !== undefined) {
        <span>{label}</span>
      }
    </PopoverTrigger>
    <PopoverContent align="end" className="flex w-64 flex-col gap-2 p-3">
      <Input
        autoFocus
        value={name}
        placeholder={"Field name"}
        aria-label={"Field name"}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-1">
        @for (const type of fieldTypes; key type) {
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            disabled={name.trim().length === 0}
            onClick={() => void create(type)}
          >
            {fieldTypeLabels[type]}
          </Button>
        }
      </div>
    </PopoverContent>
  </Popover>
}
