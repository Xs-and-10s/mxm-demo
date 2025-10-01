// lib/types.ts
import { literal, type, union } from "arktype";

export const MachineT = type({
  machineId: "string>0",
  status: union([literal("Running"), literal("Down")]),
  project: union([literal("Subcom"), literal("In-House")]),
  timeDownMinutes: "number >= 0",
  mtbfHours: "number > 0",
  mttrHours: "number > 0",
  mtbfTrend: "number[4]", // 4-week window
  mttrTrend: "number[4]",
});

export type MachineDTO = typeof MachineT.infer;
