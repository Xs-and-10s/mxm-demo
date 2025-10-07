// domain/workorders.ts
import { type } from "arktype";

export const WorkOrderSchema = type({
  id: "string > 0",
  name: "string > 0",
  status: "'Open' | 'In Progress' | 'On Hold'",
  priority: "'High' | 'Medium' | 'Low' | 'None'",
  category: "'Break-In' | 'Plan Repair' | 'PM'",
  assignees: "string[]",
  dueAt: "Date",
  recurrence: "'' | 'Weekly' | 'Every 2 wks' | 'Monthly' | 'Yearly'",
  comment: "string",
  project: "'Subcom' | 'In-House'",
  machineId: "string > 0",
});

export type WorkOrderT = typeof WorkOrderSchema.infer;
export type WOStatus = WorkOrderT["status"];
export type WOPriority = WorkOrderT["priority"];
export type WOCategory = WorkOrderT["category"];
export type WORecurrence = WorkOrderT["recurrence"];