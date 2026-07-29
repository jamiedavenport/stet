import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Badge } from '@repo/ui/components/badge';

import type { Member } from '#/content/entry/functions';
import type { FieldValue } from '@repo/content/schema';
import type { ModelField } from '#/content/model/functions';
import { optionColorClasses } from '#/content/field/option-colors';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

type CellDisplayProps = {
  field: ModelField;
  value: FieldValue | undefined;
  members: Member[];
};

/** The read view of one structured value, shared by the table and the entry page. */
export function CellDisplay({ field, value, members }: CellDisplayProps) @{
  const options = field.config.options ?? [];
  const option =
    field.type === 'select' && typeof value === 'string'
      ? options.find((candidate) => candidate.id === value)
      : undefined;
  const picked =
    field.type === 'multi_select' && Array.isArray(value)
      ? options.filter((candidate) => value.includes(candidate.id))
      : [];
  const person =
    field.type === 'person' && typeof value === 'string'
      ? members.find((member) => member.id === value)
      : undefined;

  <>
    @if (option !== undefined) {
      <Badge className={optionColorClasses[option.color]}>{option.name}</Badge>
    }
    @if (picked.length > 0) {
      <span className="flex flex-wrap gap-1">
        @for (const item of picked; key item.id) {
          <Badge className={optionColorClasses[item.color]}>{item.name}</Badge>
        }
      </span>
    }
    @if (person !== undefined) {
      <span className="flex items-center gap-1.5">
        <Avatar size="sm" className="size-5">
          <AvatarImage src={imageSrc(person.image, 64)} />
          <AvatarFallback className="text-[10px]">{initials(person.name)}</AvatarFallback>
        </Avatar>
        <span className="text-sm">{person.name}</span>
      </span>
    }
    @if (field.type === 'link' && typeof value === 'string' && value !== '') {
      <span className="max-w-56 truncate text-sm text-primary underline underline-offset-2">
        {value}
      </span>
    }
    @if ((field.type === 'text' || field.type === 'date') && typeof value === 'string') {
      <span className="max-w-72 truncate text-sm">{value}</span>
    }
    @if (field.type === 'number' && typeof value === 'number') {
      <span className="text-sm tabular-nums">{value}</span>
    }
  </>
}
