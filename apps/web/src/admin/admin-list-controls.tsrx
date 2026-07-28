import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';

import { adminPageSize } from '#/admin/functions';
import type { AdminListState } from '#/admin/use-admin-list';

export function AdminSearchForm({ label, list }: { label: string; list: AdminListState }) @{
  <form
    className="flex gap-2"
    onSubmit={(event) => {
      event.preventDefault();
      list.submit();
    }}
  >
    <Input
      aria-label={label}
      placeholder={label}
      value={list.draft}
      onChange={(event) => list.setDraft(event.target.value)}
    />
    <Button type="submit" variant="outline">
      {"Search"}
    </Button>
    @if (list.search !== '') {
      <Button type="button" variant="ghost" onClick={list.clear}>
        {"Clear"}
      </Button>
    }
  </form>
}

export function AdminPagination({
  list,
  total,
  shown,
}: {
  list: AdminListState;
  total: number;
  shown: number;
}) @{
  const from = list.page * adminPageSize + 1;
  const to = list.page * adminPageSize + shown;

  <div className="flex items-center justify-between gap-2">
    <p className="text-xs text-muted-foreground tabular-nums">
      {`${from} to ${to} of ${total}`}
    </p>
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={list.page === 0}
        onClick={list.previous}
      >
        {"Previous"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={to >= total}
        onClick={list.next}
      >
        {"Next"}
      </Button>
    </div>
  </div>
}
