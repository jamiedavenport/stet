import { XIcon } from '@phosphor-icons/react';
import { fieldTypeLabels } from '@repo/content/schema';
import { importableFieldTypes } from '@repo/import/plan';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';

import type { PlannedField, PlannedType } from '#/import/functions';

export type SkippedGroup = { source: string; reason: string };

export function ReviewStep(props: {
  types: PlannedType[];
  skipped: SkippedGroup[];
  onChange: (types: PlannedType[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) @{
  const rows = props.types.map((type, index) => ({ type, index }));

  const updateType = (index: number, patch: Partial<PlannedType>) => {
    props.onChange(props.types.map((type, at) => (at === index ? { ...type, ...patch } : type)));
  };

  const removeType = (index: number) => {
    props.onChange(props.types.filter((_, at) => at !== index));
  };

  const updateField = (index: number, at: number, patch: Partial<PlannedField>) => {
    const fields = props.types[index].fields.map((field, position) =>
      position === at ? { ...field, ...patch } : field,
    );
    updateType(index, { fields });
  };

  const addField = (index: number) => {
    updateType(index, {
      fields: [...props.types[index].fields, { name: 'New field', type: 'text', hint: '' }],
    });
  };

  const removeField = (index: number, at: number) => {
    updateType(index, { fields: props.types[index].fields.filter((_, position) => position !== at) });
  };

  <div className="flex max-w-3xl flex-col gap-4">
    <p className="text-sm text-muted-foreground">
      {"This is the model the import will create. Rename, retype, or drop anything; each field's hint tells the extraction where to look."}
    </p>
    @for (const row of rows; key row.index) {
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Input
            value={row.type.name}
            onChange={(event) => updateType(row.index, { name: event.target.value })}
            className="h-8 max-w-56 font-medium"
            aria-label="Type name"
          />
          <Badge variant="secondary">{row.type.kind}</Badge>
          <span className="text-xs text-muted-foreground">
            {`${row.type.urls.length} ${row.type.urls.length === 1 ? 'page' : 'pages'}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => removeType(row.index)}
          >
            {"Remove"}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          @for (const field of row.type.fields; key row.type.fields.indexOf(field)) {
            <div className="flex items-center gap-2">
              <Input
                value={field.name}
                onChange={(event) =>
                  updateField(row.index, row.type.fields.indexOf(field), {
                    name: event.target.value,
                  })
                }
                className="h-8 w-44"
                aria-label="Field name"
              />
              <Select
                value={field.type}
                onValueChange={(value) =>
                  updateField(row.index, row.type.fields.indexOf(field), {
                    type: value as PlannedField['type'],
                  })
                }
              >
                <SelectTrigger className="h-8 w-32 text-xs" aria-label="Field type">
                  <SelectValue />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    @for (const fieldType of importableFieldTypes; key fieldType) {
                      <SelectItem value={fieldType}>{fieldTypeLabels[fieldType]}</SelectItem>
                    }
                  </SelectContent>
                </SelectPositioner>
              </Select>
              <Input
                value={field.hint}
                onChange={(event) =>
                  updateField(row.index, row.type.fields.indexOf(field), {
                    hint: event.target.value,
                  })
                }
                placeholder="Where this lives on the page"
                className="h-8 flex-1 text-xs"
                aria-label="Field hint"
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove field"
                onClick={() => removeField(row.index, row.type.fields.indexOf(field))}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          }
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => addField(row.index)}
          >
            {"Add field"}
          </Button>
        </CardContent>
      </Card>
    }
    @if (props.skipped.length > 0) {
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="font-medium">{"Left out of the proposal"}</span>
        @for (const skip of props.skipped; key skip.source) {
          <span>{`${skip.source}: ${skip.reason}`}</span>
        }
      </div>
    }
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={props.onBack}>
        {"Back"}
      </Button>
      <Button onClick={props.onContinue} disabled={props.types.length === 0}>
        {"Preview extraction"}
      </Button>
    </div>
  </div>
}
