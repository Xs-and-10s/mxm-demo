"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ----- Types
export type WOStatus = "Open" | "In Progress" | "On Hold";
export type WOPriority = "High" | "Medium" | "Low" | "None";
export type WOCategory = "Break-In" | "Plan Repair" | "PM";
export type WORecurrence = "" | "Weekly" | "Every 2 wks" | "Monthly" | "Yearly";

export type WorkOrder = {
  id: string; // internal id (hidden column)
  name: string; // e.g., "608 - 6 MONTH - PM"
  status: WOStatus;
  priority: WOPriority;
  category: WOCategory;
  assignees: string[]; // one or more
  dueAt: Date; // due date-time
  recurrence: WORecurrence;
  comment: string; // (not shown; comments live in thread model)
  project: "Subcom" | "In-House";
  machineId: string;
};

type Props = {
  workOrders: WorkOrder[];
  /** Emits the selected WorkOrder (thread is looked up by id in the parent). */
  onRowSelect?: (wo: WorkOrder) => void;
};

// ----- Styling helpers
const STATUS_STYLE: Record<WOStatus, { color: string; bg: string; border: string }> = {
  Open: { color: "#1d4ed8", bg: "rgba(29,78,216,0.10)", border: "#3b82f6" }, // blue
  "In Progress": { color: "#b45309", bg: "rgba(180,83,9,0.10)", border: "#f59e0b" }, // amber/brown
  "On Hold": { color: "#475569", bg: "rgba(71,85,105,0.10)", border: "#94a3b8" }, // slate
};

const PRIORITY_STYLE: Record<WOPriority, { color: string; bg: string; border: string }> = {
  High: { color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "#ef4444" }, // red
  Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "#f59e0b" }, // amber
  Low: { color: "#16a34a", bg: "rgba(22,163,74,0.10)", border: "#16a34a" }, // green
  None: { color: "#64748b", bg: "rgba(100,116,139,0.10)", border: "#94a3b8" }, // slate
};

const CATEGORY_STYLE: Record<WOCategory, { color: string; bg: string; border: string }> = {
  "Break-In": { color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "#ef4444" },
  "Plan Repair": { color: "#6366f1", bg: "rgba(99,102,241,0.10)", border: "#6366f1" },
  PM: { color: "#16a34a", bg: "rgba(22,163,74,0.10)", border: "#16a34a" },
};

// Project-colored left accent for selection (match Machines styling)
const PROJECT_ACCENT: Record<WorkOrder["project"], string> = {
  Subcom: "#0284c7",   // blue
  "In-House": "#f59e0b" // yellow/amber
};

// US format: MM/DD/YYYY, hh:mm AM/PM
function formatDue(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const am = hh < 12;
  hh = hh % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy}, ${String(hh).padStart(2, "0")}:${min} ${am ? "AM" : "PM"}`;
}

export default function WorkOrdersTable({ workOrders, onRowSelect }: Props) {
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Work Order</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Priority</TableHead>
            <TableHead scope="col">Categories</TableHead>
            <TableHead scope="col">Assigned To</TableHead>
            <TableHead scope="col">Due Date</TableHead>
            <TableHead scope="col">Recurrence</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {workOrders.map((wo) => {
            const isActive = active === wo.id;
            const statusSty = STATUS_STYLE[wo.status];
            const prioSty = PRIORITY_STYLE[wo.priority];
            const catSty = CATEGORY_STYLE[wo.category];

            return (
              <TableRow
                key={wo.id}
                className="cursor-pointer"
                aria-selected={isActive}
                style={
                  isActive
                    ? {
                        // darker, high-contrast highlight + left accent bar
                        background: "rgba(100,116,139,0.22)", // slate-500 @ ~22%
                        boxShadow: `inset 4px 0 0 0 ${PROJECT_ACCENT[wo.project]}`,
                      }
                    : undefined
                }
                onClick={() => {
                  setActive(wo.id);
                  onRowSelect?.(wo);
                }}
              >
                {/* Work Order (name) */}
                <TableCell className="font-medium">{wo.name}</TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-medium"
                    style={{
                      color: statusSty.color,
                      background: statusSty.bg,
                      borderColor: statusSty.border,
                    }}
                  >
                    {wo.status}
                  </Badge>
                </TableCell>

                {/* Priority */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-medium"
                    style={{
                      color: prioSty.color,
                      background: prioSty.bg,
                      borderColor: prioSty.border,
                    }}
                  >
                    {wo.priority}
                  </Badge>
                </TableCell>

                {/* Categories */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-medium"
                    style={{
                      color: catSty.color,
                      background: catSty.bg,
                      borderColor: catSty.border,
                    }}
                  >
                    {wo.category}
                  </Badge>
                </TableCell>

                {/* Assigned To */}
                <TableCell className="max-w-[1px]">
                  <div className="flex flex-wrap gap-1">
                    {wo.assignees.map((name) => (
                      <Badge key={name} variant="outline" className="max-w-[180px] truncate">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                {/* Due Date */}
                <TableCell>{formatDue(wo.dueAt)}</TableCell>

                {/* Recurrence */}
                <TableCell>{wo.recurrence || ""}</TableCell>
              </TableRow>
            );
          })}

          {workOrders.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>No work orders.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
