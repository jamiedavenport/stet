import type { PageRoom } from '@repo/realtime/client';

import { InlineCell } from '#/content/cells/inline-cell.tsrx';
import { Watchers } from '#/content/cells/watchers.tsrx';
import { useCellWatchers } from '#/content/presence';

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

  const commit = (raw: string): boolean => {
    const value = raw.trim();
    if (value === '') {
      return false;
    }
    if (value !== props.value) {
      void props.onSave(value);
    }
    return true;
  };

  <span className="flex w-full items-center gap-1">
    <InlineCell
      label={props.label}
      inputLabel={`${props.label} value`}
      text={props.value}
      mono={props.mono}
      onCommit={commit}
      onEditingChange={props.onEditingChange}
    >
      <span
        className={
          props.mono === true
            ? 'block truncate font-mono text-xs text-muted-foreground'
            : 'block truncate text-sm font-medium'
        }
      >
        {props.value}
      </span>
    </InlineCell>
    <Watchers watchers={watchers} />
  </span>
}
