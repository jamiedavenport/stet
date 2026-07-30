import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Badge } from '@repo/ui/components/badge';
import { FileIcon } from '@phosphor-icons/react';

import { useCellData } from '#/content/cells/context';
import type { Member } from '#/content/entry/functions';
import { isReferenceType } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import type { ModelField } from '#/content/model/functions';
import { optionColorClasses } from '#/content/field/option-colors';
import { imageSrc, publicAssetUrl } from '#/files/urls';
import { initials } from '#/initials';

type CellDisplayProps = {
  field: ModelField;
  value: FieldValue | undefined;
  members: Member[];
};

/** The ids a reference value holds, whether it is single or multiple. */
function referencedIds(value: FieldValue | undefined): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  return Array.isArray(value) ? value : [];
}

/** The read view of one structured value, shared by the table and the entry page. */
export function CellDisplay({ field, value, members }: CellDisplayProps) @{
  const { lookup } = useCellData();
  const options = field.config.options ?? [];
  const referenced = isReferenceType(field.type)
    ? referencedIds(value).map((id) => ({ id, title: lookup.entries[id] }))
    : [];
  const asset =
    field.type === 'asset' && typeof value === 'string'
      ? { id: value, ...lookup.assets[value] }
      : undefined;
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
    @if (referenced.length > 0) {
      <span className="flex flex-wrap gap-1">
        @for (const item of referenced; key item.id) {
          {/* A title of undefined means the target is gone: the value stays
            until someone edits the field, so it has to render as something. */}
          <Badge variant={item.title === undefined ? 'outline' : 'secondary'}>
            {item.title ?? "Deleted entry"}
          </Badge>
        }
      </span>
    }
    @if (asset !== undefined) {
      <span className="flex items-center gap-1.5">
        @if (asset.contentType?.startsWith('image/') === true) {
          <img
            src={imageSrc(publicAssetUrl(asset.id), 64)}
            alt=""
            className="size-5 rounded object-cover"
          />
        } @else {
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        }
        <span className="max-w-56 truncate text-sm">{asset.name ?? "Missing file"}</span>
      </span>
    }
  </>
}
