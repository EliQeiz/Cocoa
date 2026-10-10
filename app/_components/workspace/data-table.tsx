"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Database, X } from "lucide-react";
import { useMemo, useState } from "react";

type WorkspaceDataTableProps = {
  title: string;
  columns: string[];
  rows: Record<string, unknown>[];
  loading: boolean;
  canCreate?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  pageIndex?: number;
  pageSize?: number;
  onSort?: () => void;
};

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function WorkspaceDataTable({
  title,
  columns,
  rows,
  loading,
  canCreate,
  createLabel,
  onCreate,
  pageIndex = 0,
  pageSize = 25,
  onSort,
}: WorkspaceDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const definitions = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all visible records"
            checked={table.getIsAllPageRowsSelected()}
            ref={(element) => {
              if (element)
                element.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${title} record`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
      ...columns.map((key) => ({
        id: key,
        accessorFn: (row: Record<string, unknown>) =>
          typeof row[key] === "number" ? row[key] : displayValue(row[key]),
        header: labelize(key),
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = displayValue(getValue());
          const tone = [
            "accepted",
            "approved",
            "acceptable",
            "active",
            "verified",
          ].includes(value.toLowerCase())
            ? "is-verified"
            : ["rejected", "flagged", "quarantined"].includes(
                  value.toLowerCase(),
                )
              ? "is-flagged"
              : "is-review";
          return (
            <span
              className={
                key === "status" || key === "decision"
                  ? `request-status ${tone}`
                  : undefined
              }
              title={value}
            >
              {key === "status" || key === "decision" ? labelize(value) : value}
            </span>
          );
        },
      })),
    ],
    [columns, title],
  );
  const table = useReactTable({
    data: rows,
    columns: definitions,
    state: { sorting, rowSelection, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      setSorting(updater);
      onSort?.();
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row, index) =>
      typeof row.id === "string" ? row.id : String(index),
  });
  const selectedCount = table.getSelectedRowModel().rows.length;

  if (loading) {
    return (
      <div
        className="data-table-skeleton"
        aria-label={`Loading ${title.toLowerCase()}`}
        aria-busy="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="suite-empty-state">
        <span>
          <Database size={22} />
        </span>
        <h3>No {title.toLowerCase()} yet</h3>
        <p>Add your first record to start tracking its status and history.</p>
        {canCreate && createLabel && onCreate && (
          <button type="button" onClick={onCreate}>
            {createLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {selectedCount > 0 && (
        <div className="table-bulk-bar">
          <strong>{selectedCount} selected</strong>
          <span>Selected records stay selected as you change pages.</span>
          <button type="button" onClick={() => setRowSelection({})}>
            Clear
          </button>
        </div>
      )}
      <div
        className="suite-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`${title} records`}
      >
        <table className="suite-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp size={13} />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown size={13} />
                        ) : (
                          <ArrowUpDown size={13} />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                aria-label={`Open ${title} record details`}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    setSelected(row.original);
                  }
                }}
                onClick={() => setSelected(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="record-drawer-overlay" />
          <Dialog.Content className="record-drawer">
            <div className="record-drawer-heading">
              <div>
                <p>Record details</p>
                <Dialog.Title>{title}</Dialog.Title>
              </div>
              <Dialog.Close aria-label="Close record details">
                <X size={19} />
              </Dialog.Close>
            </div>
            <Dialog.Description>
              The saved details for this record.
            </Dialog.Description>
            <dl>
              {selected &&
                columns.map((key) => (
                  <div key={key}>
                    <dt>{labelize(key)}</dt>
                    <dd>{displayValue(selected[key])}</dd>
                  </div>
                ))}
            </dl>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
