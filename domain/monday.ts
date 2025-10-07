// domain/monday.ts
import { type } from "arktype";

/** Subjob (Monday subitem) */
export const MondaySubjobSchema = type({
  id: "string > 0",
  name: "string > 0",
  status: "'Started' | 'Not Started'",
  durationDays: "number >= 0",
  recoveryDays: "number >= 0",
  dueAt: "Date",
  opNo: "number >= 0",               // e.g., 12.3 (one decimal displayed in UI)
  resource: "string > 0",            // e.g., "605"
  location: "'E' | 'W' | '-'",       // East | West | none
});

/** Job (Monday item) */
export const MondayJobSchema = type({
  id: "string > 0",                 // Job id
  customer: "string > 0",           // Customer name
  timelineStart: "Date",            // Job timeline start
  timelineEnd: "Date",              // Job timeline end
  totalRecoveryDays: "number >= 0", // "TTR" total time to recover
  subjobs: MondaySubjobSchema.array(),
  opNo: "number >= 0",
  resource: "string > 0",
  location: "'E' | 'W' | '-'",
});

export type MondaySubjobT = typeof MondaySubjobSchema.infer;
export type MondayJobT = typeof MondayJobSchema.infer;