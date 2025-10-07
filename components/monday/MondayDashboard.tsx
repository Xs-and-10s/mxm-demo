// components/monday/MondayDashboard.tsx
"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";
import CommentsThread from "@/components/CommentsThread";
import {
  MondayJobSchema,
  MondaySubjobSchema,
  type MondayJobT,
  type MondaySubjobT,
} from "@/domain/monday";
import { CommentSchema, type CommentT } from "@/domain/comment";

/* -----------------------------
   Mock data (seeded & stable)
-------------------------------- */
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
const CUSTOMERS = [
  "SubCom LLC",
  "Atlantic Fiber",
  "Pacific Cables",
  "BlueWave",
  "In‑House",
  "Global Line",
];
const SUBNAMES = [
  "Extrusion",
  "Armoring",
  "Jacketing",
  "Testing",
  "Spooling",
  "Packaging",
];

function pick<T>(rand: () => number, arr: readonly T[]): T {
  const idx = Math.floor(rand() * arr.length);
  return arr[idx]!;
}

function days(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function makeSubjobs(rand: () => number): MondaySubjobT[] {
  const count = 3 + Math.floor(rand() * 4); // 3..6 subjobs
  const out: MondaySubjobT[] = [];
  const baseStart = Date.now() - days(7);
  for (let i = 0; i < count; i++) {
    const name = pick(rand, SUBNAMES) + ` ${i + 1}`;
    const duration = 2 + Math.floor(rand() * 6); // 2..7 days
    const recovery = Math.floor(rand() * 4); // 0..3 days extra
    const offset = Math.floor(rand() * 10) - 3;
    const dueOffset = offset + duration + Math.floor(rand() * 3);

    const item: MondaySubjobT = {
      id: `sub-${Math.random().toString(36).slice(2, 9)}`,
      name,
      status: rand() > 0.4 ? "Started" : "Not Started",
      durationDays: duration,
      recoveryDays: recovery,
      dueAt: new Date(baseStart + days(dueOffset)),
    };
    if (process.env.NODE_ENV !== "production") MondaySubjobSchema.assert(item);
    out.push(item);
  }
  return out;
}

function percentStarted(subjobs: MondaySubjobT[]) {
  const started = subjobs.filter((s) => s.status === "Started").length;
  return Math.round((started / Math.max(1, subjobs.length)) * 100);
}

function computeTimeline(subjobs: MondaySubjobT[]) {
  const start = new Date(
    Math.min(...subjobs.map((s) => s.dueAt.getTime() - days(s.durationDays))),
  );
  const end = new Date(Math.max(...subjobs.map((s) => s.dueAt.getTime())));
  return { start, end };
}

function ttrDays(subjobs: MondaySubjobT[]) {
  return subjobs.reduce((acc, s) => acc + s.recoveryDays, 0);
}

function makeJob(rand: () => number, idNum: number): MondayJobT {
  const subjobs = makeSubjobs(rand);
  const { start, end } = computeTimeline(subjobs);
  const job: MondayJobT = {
    id: `JOB-${String(idNum).padStart(3, "0")}`,
    customer: pick(rand, CUSTOMERS),
    timelineStart: start,
    timelineEnd: end,
    totalRecoveryDays: ttrDays(subjobs),
    subjobs,
  };
  if (process.env.NODE_ENV !== "production") MondayJobSchema.assert(job);
  return job;
}

function makeJobs(seed: string, count = 60) {
  const rand = seedRng(seed);
  const list: MondayJobT[] = [];
  for (let i = 1; i <= count; i++) list.push(makeJob(rand, i));
  return list;
}

// Comments
const MSGS = [
  "Order reviewed with customer.",
  "Blocking issue escalated to maintenance.",
  "Awaiting QA sign-off.",
  "Material delay noted—adjusted timeline.",
  "Change order received; subjob scope updated.",
];
function makeComments(seed: string): CommentT[] {
  const rand = seedRng(seed);
  const count = Math.floor(rand() * 7); // 0..6
  const out: CommentT[] = [];
  let t = Date.now() - days(10);
  for (let i = 0; i < count; i++) {
    t += days(1) + Math.floor(rand() * 8) * 3600 * 1000;
    const item: CommentT = {
      id: `${seed}-c${i + 1}`,
      author: `User ${1 + Math.floor(rand() * 50)}`,
      message: MSGS[Math.floor(rand() * MSGS.length)]!,
      ts: new Date(t),
    };
    if (process.env.NODE_ENV !== "production") CommentSchema.assert(item);
    out.push(item);
  }
  return out;
}

/* -----------------------------
   Filter: Active Run vs Past Due
-------------------------------- */
function splitJobs(jobs: MondayJobT[]) {
  const now = Date.now();
  const active: MondayJobT[] = [];
  const pastDue: MondayJobT[] = [];
  for (const j of jobs) {
    const anyPast =
      j.timelineEnd.getTime() < now ||
      j.subjobs.some((s) => s.dueAt.getTime() < now);
    (anyPast ? pastDue : active).push(j);
  }
  return { active, pastDue };
}

/* -----------------------------
   UI helpers
-------------------------------- */
function fmtDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const p = clamp(pct, 0, 100);
  return (
    <div className={`w-full h-2 rounded bg-muted ${className ?? ""}`}>
      <div className="h-2 rounded bg-primary" style={{ width: `${p}%` }} />
    </div>
  );
}

function TimelineBar({ start, end }: { start: Date; end: Date }) {
  const now = Date.now();
  const total = end.getTime() - start.getTime();
  const elapsed = clamp(now - start.getTime(), 0, Math.max(1, total));
  const pct = clamp((elapsed / Math.max(1, total)) * 100, 0, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground min-w-[80px]">
        {fmtDate(start)}
      </span>
      <ProgressBar pct={pct} />
      <span className="text-xs text-muted-foreground min-w-[80px] text-right">
        {fmtDate(end)}
      </span>
    </div>
  );
}

function StatusesBar({ subjobs }: { subjobs: MondaySubjobT[] }) {
  return <ProgressBar pct={percentStarted(subjobs)} />;
}

/* -----------------------------
   Subjobs table (TanStack Table)
-------------------------------- */
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

function SubjobsTable({
  rows,
  onClickSub,
}: {
  rows: MondaySubjobT[];
  onClickSub: (sub: MondaySubjobT) => void;
}) {
  const columns = React.useMemo<ColumnDef<MondaySubjobT>[]>(
    () => [
      { header: "Subitem", accessorKey: "name" },
      {
        header: "Timeline",
        cell: ({ row }) => {
          const s = row.original;
          const start = new Date(s.dueAt.getTime() - days(s.durationDays));
          return (
            <div className="flex items-center gap-2">
              <div className="min-w-[60px] text-xs text-muted-foreground">
                {fmtDate(start)}
              </div>
              <ProgressBar pct={100} />
              <div className="min-w-[60px] text-xs text-muted-foreground text-right">
                {fmtDate(s.dueAt)}
              </div>
            </div>
          );
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          const isStarted = v === "Started";
          return (
            <Badge
              variant="outline"
              className="font-medium"
              style={{
                color: isStarted ? "#16a34a" : "#64748b",
                background: isStarted
                  ? "rgba(22,163,74,0.10)"
                  : "rgba(100,116,139,0.10)",
                borderColor: isStarted ? "#16a34a" : "#94a3b8",
              }}
            >
              {v}
            </Badge>
          );
        },
      },
      { header: "Duration (d)", accessorKey: "durationDays" },
      { header: "Recovery Time (d)", accessorKey: "recoveryDays" },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((r) => (
            <TableRow
              key={r.id}
              className="cursor-pointer"
              onClick={() => onClickSub(r.original)}
            >
              {r.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No subjobs.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* -----------------------------
   Virtualized list of Jobs
   - Single chevron (left) controls expansion
   - Job/Customer/TTR use text-sm
   - No nested button-in-button (Job ID button is outside trigger)
   - measureElement via virtualizer instance + data-index
-------------------------------- */
function JobsVirtualList({
  jobs,
  side,
  onOpenComments,
}: {
  jobs: MondayJobT[];
  side: "left" | "right";
  onOpenComments: (seedKey: string) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => parentRef.current,
    count: jobs.length,
    estimateSize: () => 120,
    overscan: 8,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const [openItem, setOpenItem] = React.useState<string>("");

  return (
    <div className="relative h-[560px] rounded-md border">
      {/* Sticky column header (aligned on both panes) */}
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[12px] font-medium text-muted-foreground">
          <div className="col-span-2">Job</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Statuses</div>
          <div className="col-span-3">Timeline</div>
          <div className="col-span-2 text-right">TTR</div>
        </div>
      </div>

      {/* Virtual viewport */}
      <div ref={parentRef} className="h-[calc(560px-40px)] overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          {virtualItems.map((vi) => {
            const job = jobs[vi.index]!;
            const key = job.id;

            return (
              <div
                key={key}
                data-index={vi.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
                className="border-b px-2"
              >
                <Accordion
                  type="single"
                  collapsible
                  value={openItem}
                  onValueChange={setOpenItem}
                  className="w-full"
                >
                  <AccordionItem value={key} className="border-0">
                    {/* Row summary line */}
                    <div className="grid grid-cols-12 items-center gap-2 py-2">
                      {/* Chevron trigger (only one) */}
                      <div className="col-span-2 flex items-center gap-2">
                        <AccordionPrimitive.Trigger
                          className="group inline-flex h-5 w-5 items-center justify-center rounded p-0 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={openItem === key ? "Collapse" : "Expand"}
                        >
                          <ChevronRight
                            className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90"
                          />
                        </AccordionPrimitive.Trigger>

                        {/* Job ID opens comments (NOT inside trigger) */}
                        <button
                          type="button"
                          onClick={() => onOpenComments(`job-${job.id}`)}
                          className="text-sm font-medium hover:underline"
                          title={`Open comments for ${job.id}`}
                        >
                          {job.id}
                        </button>
                      </div>

                      {/* Customer */}
                      <div className="col-span-3 text-sm">{job.customer}</div>

                      {/* Statuses */}
                      <div className="col-span-2">
                        <StatusesBar subjobs={job.subjobs} />
                      </div>

                      {/* Timeline */}
                      <div className="col-span-3">
                        <TimelineBar
                          start={job.timelineStart}
                          end={job.timelineEnd}
                        />
                      </div>

                      {/* TTR */}
                      <div className="col-span-2 text-right text-sm">
                        {job.totalRecoveryDays} d
                      </div>
                    </div>

                    <AccordionContent className="pb-3">
                      <SubjobsTable
                        rows={job.subjobs}
                        onClickSub={(sub) =>
                          onOpenComments(`sub-${job.id}-${sub.id}`)
                        }
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Main Monday layout
   - Equal header heights so lists align visually
-------------------------------- */
export default function MondayDashboard() {
  const jobs = React.useMemo(() => makeJobs("monday-jobs-seed", 60), []);
  const { active, pastDue } = React.useMemo(() => splitJobs(jobs), [jobs]);

  const commentsCache = React.useRef(new Map<string, CommentT[]>());
  const [sheetOpenRight, setSheetOpenRight] = React.useState(false);
  const [sheetOpenLeft, setSheetOpenLeft] = React.useState(false);
  const [sheetTitle, setSheetTitle] = React.useState("Comments");
  const [sheetComments, setSheetComments] = React.useState<CommentT[]>([]);

  function openComments(
    seedKey: string,
    side: "left" | "right",
    title: string,
  ) {
    if (!commentsCache.current.has(seedKey)) {
      commentsCache.current.set(seedKey, makeComments(seedKey));
    }
    setSheetTitle(title);
    setSheetComments(commentsCache.current.get(seedKey)!);
    if (side === "right") setSheetOpenRight(true);
    else setSheetOpenLeft(true);
  }

  const totalTTRPastDue = React.useMemo(
    () => pastDue.reduce((acc, j) => acc + (j.totalRecoveryDays ?? 0), 0),
    [pastDue],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ACTIVE RUN */}
      <Card className="h-full">
        <CardHeader className="h-[56px] pb-0">
          <div className="flex h-full items-center justify-between">
            <CardTitle>Active Run</CardTitle>
            {/* spacer to match Past Due header height/structure */}
            <div className="invisible flex items-baseline gap-2">
              <span className="text-xs uppercase text-muted-foreground">TTR</span>
              <span className="text-lg font-semibold">0 d</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <JobsVirtualList
            jobs={active}
            side="right"
            onOpenComments={(seed) =>
              openComments(seed, "right", "Active Run Comments")
            }
          />
        </CardContent>
      </Card>

      {/* PAST DUE */}
      <Card className="h-full">
        <CardHeader className="h-[56px] pb-0">
          <div className="flex h-full items-center justify-between">
            <CardTitle>Past Due</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase text-muted-foreground">TTR</span>
              <span className="text-lg font-semibold">{totalTTRPastDue} d</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <JobsVirtualList
            jobs={pastDue}
            side="left"
            onOpenComments={(seed) =>
              openComments(seed, "left", "Past Due Comments")
            }
          />
        </CardContent>
      </Card>

      {/* Sheets */}
      <Sheet open={sheetOpenRight} onOpenChange={setSheetOpenRight}>
        <SheetContent side="right" className="sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CommentsThread items={sheetComments} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpenLeft} onOpenChange={setSheetOpenLeft}>
        <SheetContent side="left" className="sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CommentsThread items={sheetComments} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}