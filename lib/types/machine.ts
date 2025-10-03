// lib/types.ts
import { type } from "arktype";

export const MachineT = type({
  machineId: "string > 0",
  status: "'Running' | 'Down'",
  project: "'Subcom' | 'In-House'",
  timeDownMinutes: "number >= 0",
  mtbfHours: "number > 0",
  mttrHours: "number > 0",
  mtbfTrend: ["number", "number", "number", "number"], // 4-week window
});

export type MachineDTO = typeof MachineT.infer;
