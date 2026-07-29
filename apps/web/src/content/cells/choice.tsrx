import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { CheckIcon } from '@phosphor-icons/react';

import type { Member } from '#/content/entry/functions';
import type { SelectOption } from '@repo/content/schema';
import { optionDotClasses } from '#/content/field/option-colors';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

type SelectEditorProps = {
  options: SelectOption[];
  value: string | string[] | undefined;
  multiple: boolean;
  onPick: (optionId: string) => void;
  onClear: () => void;
  onAddOption: (name: string) => Promise<void>;
};

/** Option list for select and multi-select cells, with inline option creation. */
export function SelectEditor({
  options,
  value,
  multiple,
  onPick,
  onClear,
  onAddOption,
}: SelectEditorProps) @{
  const [draft, setDraft] = useState('');
  const selected = new Set(Array.isArray(value) ? value : typeof value === 'string' ? [value] : []);

  const add = async () => {
    const name = draft.trim();
    if (name.length === 0) {
      return;
    }
    setDraft('');
    await onAddOption(name);
  };

  <div className="flex flex-col gap-1">
    @for (const option of options; key option.id) {
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
        onClick={() => onPick(option.id)}
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${optionDotClasses[option.color]}`} />
        <span className="flex-1 truncate">{option.name}</span>
        @if (selected.has(option.id)) {
          <CheckIcon className="size-3.5 text-muted-foreground" />
        }
      </button>
    }
    @if (selected.size > 0 && !multiple) {
      <Button variant="ghost" size="sm" className="justify-start" onClick={onClear}>
        {"Clear"}
      </Button>
    }
    <form
      className="mt-1 border-t pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <Input
        value={draft}
        placeholder={options.length === 0 ? "Add an option…" : "New option…"}
        aria-label={"New option name"}
        onChange={(event) => setDraft(event.target.value)}
      />
    </form>
  </div>
}

type PersonEditorProps = {
  members: Member[];
  value: string | undefined;
  onPick: (userId: string) => void;
  onClear: () => void;
};

export function PersonEditor({ members, value, onPick, onClear }: PersonEditorProps) @{
  <div className="flex flex-col gap-1">
    @for (const member of members; key member.id) {
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
        onClick={() => onPick(member.id)}
      >
        <Avatar size="sm" className="size-5">
          <AvatarImage src={imageSrc(member.image, 64)} />
          <AvatarFallback className="text-[10px]">{initials(member.name)}</AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate">{member.name}</span>
        @if (value === member.id) {
          <CheckIcon className="size-3.5 text-muted-foreground" />
        }
      </button>
    }
    @if (value !== undefined) {
      <Button variant="ghost" size="sm" className="justify-start" onClick={onClear}>
        {"Clear"}
      </Button>
    }
  </div>
}
