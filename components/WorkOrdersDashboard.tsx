"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WorkOrdersTable, {
  // type WorkOrder,
  // type WOStatus,
  // type WOPriority,
  // type WOCategory,
  // type WORecurrence,
} from "@/components/WorkOrdersTable";
import CommentsThread from "@/components/CommentsThread";
import type { WorkOrderT, WOStatus, WOPriority, WOCategory, WORecurrence } from "@/domain/workorder";
import type { CommentT } from "@/domain/comment";
import type { MachineT } from "@/domain/machine";
// import type { Machine } from "@/components/DataTable";

/** Align with Machines dataset (609 Down, 610 Running) */
const MACHINES: Pick<MachineT, "machineId" | "project" | "status">[] = [
  { machineId: "605", project: "In-House", status: "Running" },
  { machineId: "606", project: "In-House", status: "Down" },
  { machineId: "607", project: "Subcom",   status: "Running" },
  { machineId: "608", project: "Subcom",   status: "Down" },
  { machineId: "609", project: "Subcom",   status: "Down" },
  { machineId: "610", project: "Subcom",   status: "Running" },
  { machineId: "611", project: "In-House", status: "Running" },
];

/** Seeded RNG for stable mock data */
function seedRng(seed: string) {
  let h = (2166136261 >>> 0) as number;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return (((t ^ (t >>> 14)) >>> 0) as number) / 4294967296;
  };
}

const NAMES = [
  "Alex Chen",
  "Brooke Patel",
  "Chris Rivera",
  "Dana Smith",
  "Evan Lee",
  "Fatima Khan",
  "Gabe Flores",
  "Harper Young",
];

const PLAN_TITLES = [
  "WEEKLY INSPECTION",
  "6 MONTH - PM",
  "MONTHLY SAFETY CHECK",
  "BELT & PULLEY CHECK",
  "SENSOR CLEANING",
  "LUBRICATION ROUTINE",
];

const STATUSES: WOStatus[] = ["Open", "In Progress", "On Hold"];
const PRIORITIES: WOPriority[] = ["High", "Medium", "Low", "None"];
const CATEGORIES: WOCategory[] = ["Break-In", "Plan Repair", "PM"];
const RECURRENCES: WORecurrence[] = ["", "Weekly", "Every 2 wks", "Monthly", "Yearly"];

const MSG_SNIPPETS = [
  "Inspected and verified alignment.",
  "Cleaned optical sensor; readings normalized.",
  "Parts on order—delayed shipping.",
  "Operator reported intermittent noise—unable to reproduce.",
  "Re-calibrated load cell and documented results.",
  "Replaced worn pulley and lubricated bearings.",
  "Investigated over-temp alarm; fan shroud was blocked.",
  "Updated SOP for belt inspection checklist.",
];

function pick<T>(rand: () => number, arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error("pick: cannot pick from an empty array");
  }
  const idx = Math.floor(rand() * arr.length);
  return arr[idx]!;
}
function pickMany<T>(rand: () => number, arr: readonly T[], min = 1, max = 2): T[] {
  const n = min + Math.floor(rand() * (max - min + 1));
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0] as T);
  }
  return out;
}
function randFutureDate(rand: () => number): Date {
  const now = new Date();
  const days = Math.floor(rand() * 21) - 5;
  const hours = Math.floor(rand() * 24);
  const mins = [0, 15, 30, 45][Math.floor(rand() * 4)]!;
  const d = new Date(now);
  d.setDate(now.getDate() + days);
  d.setHours(hours, mins, 0, 0);
  return d;
}
function makeName(machineId: string, rand: () => number): string {
  return `${machineId} - ${pick(rand, PLAN_TITLES)}`;
}

function makeMockWOs(machineId: string, project: "Subcom" | "In-House"): WorkOrderT[] {
  const rand = seedRng(`${project}-${machineId}-wo`);
  const n = 5 + Math.floor(rand() * 4); // 5..8 WOs
  const arr: WorkOrderT[] = [];
  for (let i = 1; i <= n; i++) {
    const status = pick(rand, STATUSES);
    const priority = pick(rand, PRIORITIES);
    const category = pick(rand, CATEGORIES);
    const assignees = pickMany(rand, NAMES, 1, rand() > 0.75 ? 3 : 2);
    const dueAt = randFutureDate(rand);
    const recurrence = pick(rand, RECURRENCES);
    arr.push({
      id: `WO-${machineId}-${String(i).padStart(2, "0")}`,
      name: makeName(machineId, rand),
      status,
      priority,
      category,
      assignees,
      dueAt,
      recurrence,
      comment: "",
      project,
      machineId,
    });
  }
  return arr;
}

function makeMockComments(woId: string): CommentT[] {
  const rand = seedRng(`${woId}-comments`);
  const count = Math.floor(rand() * 16); // 0..15
  const out: CommentT[] = [];
  const base = Date.now() - Math.floor(rand() * 10 * 24 * 60 * 60 * 1000);
  let t = base;
  for (let i = 0; i < count; i++) {
    const addHrs = 1 + Math.floor(rand() * 6);
    const addSecs = Math.floor(rand() * 1800);
    t += addHrs * 3600 * 1000 + addSecs * 1000;
    out.push({
      id: `${woId}-c${String(i + 1).padStart(2, "0")}`,
      author: pick(rand, NAMES),
      message: pick(rand, MSG_SNIPPETS),
      ts: new Date(t),
    });
  }
  return out;
}

export default function WorkOrdersDashboard() {
  // Build WO map and per-WO comments (stable across renders)
  const { woByMachine, commentsByWO } = React.useMemo(() => {
    const woMap = new Map<string, WorkOrderT[]>();
    const cmMap = new Map<string, CommentT[]>();
    for (const m of MACHINES) {
      const wos = makeMockWOs(m.machineId, m.project);
      woMap.set(m.machineId, wos);
      for (const wo of wos) {
        cmMap.set(wo.id, makeMockComments(wo.id));
      }
    }
    return { woByMachine: woMap, commentsByWO: cmMap };
  }, []);

  // Comments thread state
  const [thread, setThread] = React.useState<CommentT[]>([]);

  // Single accordion: only one machine expanded at a time (across both projects)
  const [openItem, setOpenItem] = React.useState("");

  const subcom = MACHINES.filter((m) => m.project === "Subcom");
  const inhouse = MACHINES.filter((m) => m.project === "In-House");

  const renderGroup = (label: string, items: typeof MACHINES) => (
    <>
      <div className="px-1 pb-1 pt-2 text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      {items.map((m) => {
        const key = `m-${m.machineId}`;
        const count = woByMachine.get(m.machineId)?.length ?? 0;
        const isDown = m.status === "Down";
        return (
          <AccordionItem key={key} value={key} className="border-b">
            <AccordionTrigger className="justify-between">
              {/* LEFT: machine label + count + (optional) Down badge */}
              <div className="flex items-center gap-2">
                <span
                  className="font-medium"
                  style={{
                    color: isDown ? "#ef4444" : undefined,
                    fontWeight: isDown ? 700 : 600,
                  }}
                >
                  Machine {m.machineId}
                </span>
                <Badge variant="outline" className="text-xs">
                  {count} WOs
                </Badge>
                {isDown && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      color: "#ef4444",
                      background: "rgba(239,68,68,0.10)",
                      borderColor: "#ef4444",
                    }}
                  >
                    Down
                  </Badge>
                )}
              </div>
              {/* RIGHT: keep empty so any built-in chevron aligns right */}
              <span aria-hidden="true" />
            </AccordionTrigger>

            <AccordionContent>
              <WorkOrdersTable
                workOrders={woByMachine.get(m.machineId) ?? []}
                onRowSelect={(wo) => {
                  setThread(commentsByWO.get(wo.id) ?? []);
                }}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* LEFT: Accordions (2/3 width) */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Accordion
              type="single"
              collapsible
              value={openItem}
              onValueChange={(v) => setOpenItem(v)}
              className="w-full"
            >
              {renderGroup("Subcom", subcom)}
              {renderGroup("In‑House", inhouse)}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Comments thread (1/3 width) */}
      <div className="md:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CommentsThread items={thread} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
