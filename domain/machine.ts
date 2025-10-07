// domain/machines.ts
import { type } from "arktype";

/**
 * Machine domain schema (runtime-validatable).
 * Note: Includes both mtbfTrend and mttrTrend as fixed 4-week windows.
 */
export const MachineSchema = type({
  machineId: "string > 0",
  status: "'Running' | 'Down'",
  project: "'Subcom' | 'In-House'",
  timeDownMinutes: "number >= 0",
  mtbfHours: "number > 0",
  mttrHours: "number > 0",
  mtbfTrend: ["number", "number", "number", "number"], // 4-week window
  mttrTrend: ["number", "number", "number", "number"], // 4-week window
});

export type MachineT = typeof MachineSchema.infer;
export type MachineProject = MachineT["project"];
export type MachineStatus = MachineT["status"];