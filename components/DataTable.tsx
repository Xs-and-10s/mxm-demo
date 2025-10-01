"use client";

import * as React from "react";
import {
  type ColumnDef,
  type FilterFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/** Domain model shared by MachinesDashboard + charts */
export type Machine = {
  machineId: string;
  status: "Running" | "Down";
  timeDownMinutes: number;
  project: "Subcom" | "In-House";
  mtbfHours: number;
  mttrHours: number;
  mtbfTrend?: number[];
  mttrTrend?: number[];
};

type Props = {
  data: Machine[];
  filter: string;
  onFilterChange: (value: string) => void;
  /** Bubble the currently visible (filtered/sorted) rows up to the parent (for charts). */
  onVisibleDataChange?: (rows: Machine[]) => void;
  /** Row to visually highlight (from chart click). */
  selectedMachineId?: string;
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (minutes === 0) return "0m";
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Status tint used in "Status" column
const STATUS_COLORS = {
  green: { stroke: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  red: { stroke: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

// Project tint for selected-row highlight
const PROJECT_TINT: Record<Machine["project"], { bg: string; border: string }> = {
  Subcom: { bg: "rgba(2,132,199,0.12)", border: "#0284c7" }, // blue
  "In-House": { bg: "rgba(245,158,11,0.15)", border: "#f59e0b" }, // yellow
};

// ---------------- columns ----------------

const columns: ColumnDef<Machine, any>[] = [
  // Hidden but searchable
  {
    accessorKey: "project",
    header: "Project",
    cell: ({ row }) => row.getValue("project") as string,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "machineId",
    header: "Machine ID",
    cell: ({ row }) => {
      const id = row.getValue("machineId") as string;
      const isDown = row.original.status === "Down";
      return (
        <span
          className="font-medium"
          style={{ color: isDown ? "#ef4444" : undefined, fontWeight: isDown ? 700 : 600 }}
        >
          {id}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Machine["status"];
      const swatch = status === "Running" ? STATUS_COLORS.green : STATUS_COLORS.red;
      return (
        <Badge
          variant="outline"
          className="font-medium"
          style={{ color: swatch.stroke, background: swatch.bg, borderColor: swatch.stroke }}
        >
          {status}
        </Badge>
      );
    },
    sortingFn: (a, b, columnId) => {
      const order = { Running: 0, Down: 1 } as const;
      const av = order[a.getValue(columnId) as keyof typeof order] ?? 99;
      const bv = order[b.getValue(columnId) as keyof typeof order] ?? 99;
      return av - bv;
    },
  },
  {
    accessorKey: "timeDownMinutes",
    header: "Time Down",
    cell: ({ row }) => <>{formatDuration((row.getValue("timeDownMinutes") as number) ?? 0)}</>,
    sortingFn: (a, b, columnId) =>
      ((a.getValue(columnId) as number) ?? 0) - ((b.getValue(columnId) as number) ?? 0),
  },
];

// ---------------- component ----------------

export default function DataTable({
  data,
  filter,
  onFilterChange,
  onVisibleDataChange,
  selectedMachineId,
}: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility] = React.useState<Record<string, boolean>>({
    project: false,
  });

  // Global filter includes hidden 'project' and formatted duration
  const globalFilterFn: FilterFn<Machine> = (row, _columnId, value) => {
    const search = String(value ?? "").toLowerCase().trim();
    if (!search) return true;
    const m = row.original;
    const haystack = [m.machineId, m.status, m.project, formatDuration(m.timeDownMinutes)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: onFilterChange,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const allRows = table.getRowModel().rows;
  const rowsS = allRows.filter((r) => r.original.project === "Subcom");
  const rowsI = allRows.filter((r) => r.original.project === "In-House");

  // Bubble up currently visible rows for charts
  React.useEffect(() => {
    onVisibleDataChange?.(allRows.map((r) => r.original));
  }, [allRows, onVisibleDataChange]);

  const visibleColumnCount = table.getAllLeafColumns().length;

  return (
    <div className="space-y-3">
      {/* Global filter */}
      <Input
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Search machine, status, project…"
        className="max-w-sm"
        aria-label="Search machines"
      />

      {/* IMPORTANT: Valid table structure to avoid hydration errors */}
      <Table>
        {/* HEAD */}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted() as false | "asc" | "desc";
                return (
                  <TableHead key={header.id}>
                    {/** biome-ignore lint/a11y/useAriaPropsSupportedByRole: <explanation> */}
<button
                      type="button"
                      className={canSort ? "inline-flex items-center gap-1" : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                      }
                      aria-label={canSort ? `Sort by ${String(header.column.columnDef.header)}` : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort ? (
                        <span aria-hidden>
                          {sorted === "asc" ? " ▲" : sorted === "desc" ? " ▼" : " ▬"}
                        </span>
                      ) : null}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        {/* BODY */}
        <TableBody>
          {/* Project: Subcom */}
          {rowsS.length > 0 && (
            <>
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="bg-muted/40 text-xs font-medium uppercase">
                  Subcom ({rowsS.length})
                </TableCell>
              </TableRow>

              {rowsS.map((row) => {
                const isSelected = row.original.machineId === selectedMachineId;
                const tint = PROJECT_TINT[row.original.project];
                return (
                  <TableRow
                    key={row.id}
                    aria-selected={isSelected}
                    className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                    style={
                      isSelected
                        ? {
                            background: tint.bg,
                            boxShadow: `inset 2px 0 0 0 ${tint.border}`,
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </>
          )}

          {/* Project: In‑House */}
          {rowsI.length > 0 && (
            <>
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="bg-muted/40 text-xs font-medium uppercase">
                  In‑House ({rowsI.length})
                </TableCell>
              </TableRow>

              {rowsI.map((row) => {
                const isSelected = row.original.machineId === selectedMachineId;
                const tint = PROJECT_TINT[row.original.project];
                return (
                  <TableRow
                    key={row.id}
                    aria-selected={isSelected}
                    className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                    style={
                      isSelected
                        ? {
                            background: tint.bg,
                            boxShadow: `inset 2px 0 0 0 ${tint.border}`,
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </>
          )}

          {/* No results */}
          {rowsS.length === 0 && rowsI.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumnCount}>No results.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}