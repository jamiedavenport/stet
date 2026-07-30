import { useRef, useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react';

import {
  fieldTypeLabels,
  fieldTypes,
  isReferenceType,
  nextOptionColor,
  optionColors,
} from '@repo/content/schema';
import type { FieldType, SelectOption } from '@repo/content/schema';
import { addRowClasses } from '#/content/add-row';
import { createField, deleteField, moveField, updateField } from '#/content/field/functions';
import { contentModelQuery } from '#/content/model/functions';
import type { ModelField } from '#/content/model/functions';
import { optionDotClasses } from '#/content/field/option-colors';
import { useAppRoute } from '#/use-app-route';

type FieldHeaderProps = {
  field: ModelField;
  /** Whether the field renders as a table column or a map row. */
  orientation?: 'column' | 'row';
  onChanged: () => Promise<void>;
};

/** A field's name, opening its settings: rename, options, move, delete. */
export function FieldHeader({ field, orientation = 'column', onChanged }: FieldHeaderProps) @{
  const { activeOrganization } = useAppRoute();
  const model = useSuspenseQuery(contentModelQuery(activeOrganization.id)).data;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(field.name);
  const [options, setOptions] = useState(field.config.options ?? []);
  // The name last written, so committing on Enter and again on the blur that
  // closing causes is one rename, not two.
  const saved = useRef(field.name);
  // Refetching the model rebuilds the table's columns, which remounts this
  // header and closes the popover mid-edit. So settings render from local
  // state and the refetch waits for the popover to close. Closing races the
  // write that dismissing the popover started, hence the in-flight one.
  const writing = useRef<Promise<unknown> | null>(null);
  const hasOptions = field.type === 'select' || field.type === 'multi_select';
  // What a reference points at, named rather than shown as its id. Absent if
  // the target collection has since been deleted.
  const target = model.types.find((candidate) => candidate.id === field.config.typeId);

  const write = async (change: { name?: string; config?: { options: SelectOption[] } }) => {
    const settled = updateField({ data: { id: field.id, ...change } });
    writing.current = settled;
    await settled;
  };

  const refresh = async () => {
    const settled = writing.current;
    writing.current = null;
    await settled;
    await onChanged();
  };

  const rename = async () => {
    const next = name.trim();
    if (next.length === 0 || next === saved.current) {
      return;
    }
    saved.current = next;
    await write({ name: next });
  };

  // Closing from here is our own state change, which Base UI does not report
  // back through onOpenChange, so this refetches for itself.
  const submit = async () => {
    await rename();
    setOpen(false);
    if (writing.current !== null) {
      await refresh();
    }
  };

  const saveOptions = async (next: SelectOption[]) => {
    setOptions(next);
    await write({ config: { options: next } });
  };

  const move = async (direction: 'left' | 'right') => {
    await moveField({ data: { id: field.id, direction } });
    await refresh();
  };

  const remove = async () => {
    await deleteField({ data: { id: field.id } });
    await refresh();
  };

  <Popover
    open={open}
    onOpenChange={(next) => {
      setOpen(next);
      if (!next && writing.current !== null) {
        void refresh();
      }
    }}
  >
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
              void submit();
            }
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {`${fieldTypeLabels[field.type]} · `}
        <code>{field.key}</code>
        @if (target !== undefined) {
          {` → ${target.name}`}
        }
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
            <CaretUpIcon className="size-4" />
          }
          @if (orientation === 'column') {
            <CaretLeftIcon className="size-4" />
          }
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={orientation === 'row' ? 'Move down' : 'Move right'}
          onClick={() => void move('right')}
        >
          @if (orientation === 'row') {
            <CaretDownIcon className="size-4" />
          }
          @if (orientation === 'column') {
            <CaretRightIcon className="size-4" />
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

const simpleTypes = fieldTypes.filter((type) => !isReferenceType(type));
const referenceFieldTypes = fieldTypes.filter((type) => isReferenceType(type));

/**
 * The "add a field" menu: pick a type and the field exists, named "Untitled"
 * until its header renames it. A reference type opens a submenu instead,
 * because it cannot exist without knowing the collection it points at.
 */
export function AddField({ typeId, label, onCreated }: AddFieldProps) @{
  const { activeOrganization } = useAppRoute();
  const model = useSuspenseQuery(contentModelQuery(activeOrganization.id)).data;

  const collections = model.types.filter(
    (candidate) => candidate.kind === 'collection' && candidate.id !== typeId,
  );

  const create = async (type: FieldType, config?: { typeId: string }) => {
    await createField({ data: { typeId, name: 'Untitled', type, config } });
    await onCreated();
  };

  <DropdownMenu>
    <DropdownMenuTrigger
      aria-label={"Add a field"}
      className={
        label === undefined
          ? 'flex size-6 items-center justify-center rounded-md hover:bg-muted'
          : addRowClasses
      }
    >
      <PlusIcon className="size-4" />
      @if (label !== undefined) {
        <span>{label}</span>
      }
    </DropdownMenuTrigger>
    <DropdownMenuContent align={label === undefined ? 'end' : 'start'} className="w-44">
      @for (const type of simpleTypes; key type) {
        <DropdownMenuItem onClick={() => void create(type)}>
          {fieldTypeLabels[type]}
        </DropdownMenuItem>
      }
      @for (const type of referenceFieldTypes; key type) {
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{fieldTypeLabels[type]}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            @for (const candidate of collections; key candidate.id) {
              <DropdownMenuItem onClick={() => void create(type, { typeId: candidate.id })}>
                {candidate.name}
              </DropdownMenuItem>
            } @empty {
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {"No other collection to point at yet."}
              </p>
            }
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      }
    </DropdownMenuContent>
  </DropdownMenu>
}
