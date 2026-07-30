import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from '@phosphor-icons/react';

import { addRowClasses } from '#/content/add-row';
import type { EntryRow } from '#/content/entry/functions';

// Written as plain TSX rather than TSRX: the table renders through TanStack
// Table's flexRender header/cell functions, which the directive syntax
// cannot express.
export function EntriesTable({
  columns,
  entries,
  onAddEntry,
}: {
  columns: ColumnDef<EntryRow>[];
  entries: EntryRow[];
  onAddEntry: () => void;
}) {
  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    // Bleeds to the inset panel's edges: the negative margins cancel the page
    // padding, and the first/last cells put it back so content stays aligned.
    <div className="-mx-6 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
      <Table className="border-b">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="group/row h-12">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="px-2 py-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <button type="button" onClick={onAddEntry} className={addRowClasses}>
        <PlusIcon className="size-4 shrink-0" />
        {'New entry'}
      </button>
    </div>
  );
}
