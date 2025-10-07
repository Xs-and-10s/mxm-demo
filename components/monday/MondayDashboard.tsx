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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";
import CommentsThread from "@/components/CommentsThread";
import {
  MondayJobSchema,
  MondaySubjobSchema,
  type MondayJobT,
  type MondaySubjobT,
} from "@/domain/monday";
import { CommentSchema, type CommentT } from "@/domain/comment";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

/* ──────────────────────────────────────────────────────────────────────────────
   RNG (deterministic, string-seeded) + small utilities
   ──────────────────────────────────────────────────────────────────────────── */
function hashSeed(seed: string) {
  // FNV-1a 32-bit
  let h = (0x811c9dc5 >>> 0) as number;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedRng(seed: string) {
  return mulberry32(hashSeed(seed));
}

const CUSTOMERS = [
  "SubCom LLC",
  "Atlantic Fiber",
  "Pacific Cables",
  "BlueWave",
  "In‑House",
  "Global Line",
] as const;
const SUBNAMES = ["Extrusion", "Armoring", "Jacketing", "Testing", "Spooling", "Packaging"] as const;
const MACHINE_IDS = ["605", "606", "607", "608", "609", "610", "611"] as const;

function pick<T>(rand: () => number, arr: readonly T[]): T {
  const idx = Math.floor(rand() * arr.length);
  return arr[idx]!;
}
function pickLoc(rand: () => number): MondayJobT["location"] {
  const r = rand();
  if (r < 0.44) return "E";
  if (r < 0.88) return "W";
  return "-";
}
function opNo(rand: () => number) {
  // 10.0 .. 90.9 (one decimal)
  const whole = 10 + Math.floor(rand() * 81); // 10..90
  const dec = Math.floor(rand() * 10); // 0..9
  return Number(`${whole}.${dec}`);
}
function resource(rand: () => number) {
  return pick(rand, MACHINE_IDS);
}
function days(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Mock data (seeded & stable for demo)
   ──────────────────────────────────────────────────────────────────────────── */
function makeSubjobs(rand: () => number): MondaySubjobT[] {
  const count = 3 + Math.floor(rand() * 4); // 3..6 subjobs
  const out: MondaySubjobT[] = [];
  const baseStart = Date.now() - days(7);
  for (let i = 0; i < count; i++) {
    const name = pick(rand, SUBNAMES) + ` ${i + 1}`;
    const duration = 2 + Math.floor(rand() * 6); // 2..7 days
    const recovery = Math.floor(rand() * 4); // 0..3 days extra
    const offset = Math.floor(rand() * 10) - 3; // start offset in days
    const dueOffset = offset + duration + Math.floor(rand() * 3);

    const seededId = `sub-${Math.floor(rand() * 36 ** 6)
      .toString(36)
      .padStart(6, "0")}`; // deterministic seeded ID

    const item: MondaySubjobT = {
      id: seededId,
      name,
      status: rand() > 0.4 ? "Started" : "Not Started",
      durationDays: duration,
      recoveryDays: recovery,
      dueAt: new Date(baseStart + days(dueOffset)),
      opNo: opNo(rand),
      resource: resource(rand),
      location: pickLoc(rand),
    };
    if (process.env.NODE_ENV !== "production") MondaySubjobSchema.assert(item);
    out.push(item);
  }
  return out;
}
function computeTimeline(subjobs: MondaySubjobT[]) {
  if (subjobs.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }
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
    customer: pick(rand, CUSTOMERS) as string,
    timelineStart: start,
    timelineEnd: end,
    totalRecoveryDays: ttrDays(subjobs),
    subjobs,
    opNo: opNo(rand),
    resource: resource(rand),
    location: pickLoc(rand),
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

// Comments (Jobs only)
type CommentTStrict = CommentT;
const MSGS = [
  "Order reviewed with customer.",
  "Blocking issue escalated to maintenance.",
  "Awaiting QA sign-off.",
  "Material delay noted—adjusted timeline.",
  "Change order received; subjob scope updated.",
] as const;
function makeComments(seed: string): CommentTStrict[] {
  const rand = seedRng(seed);
  const count = Math.floor(rand() * 7); // 0..6
  const out: CommentTStrict[] = [];
  let t = Date.now() - days(10);
  for (let i = 0; i < count; i++) {
    t += days(1) + Math.floor(rand() * 8) * 3600 * 1000;
    const item: CommentTStrict = {
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

/* ──────────────────────────────────────────────────────────────────────────────
   Filtering: Active Run vs Past Due
   ──────────────────────────────────────────────────────────────────────────── */
function splitJobs(jobs: MondayJobT[]) {
  const now = Date.now();
  const active: MondayJobT[] = [];
  const pastDue: MondayJobT[] = [];
  for (const j of jobs) {
    const isPastDue = j.timelineEnd.getTime() < now;
    (isPastDue ? pastDue : active).push(j);
  }
  return { active, pastDue };
}

/* ──────────────────────────────────────────────────────────────────────────────
   UI helpers
   ──────────────────────────────────────────────────────────────────────────── */
function fmtDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** TIMELINE (Jobs): vertically stacked, no progress bar */
function JobTimeline({ start, end }: { start: Date; end: Date }) {
  return (
    <div className="flex flex-col items-stretch gap-1">
      <span className="text-xs text-muted-foreground">{fmtDate(start)}</span>
      <span className="text-xs text-muted-foreground">{fmtDate(end)}</span>
    </div>
  );
}

// Location highlight tints (row selection)
const LOC_TINT = {
  E: { bg: "rgba(245,158,11,0.16)", border: "#f59e0b" }, // amber
  W: { bg: "rgba(2,132,199,0.14)", border: "#0284c7" },   // blue
  "-": { bg: "rgba(100,116,139,0.12)", border: "#94a3b8" }, // gray
} as const;

// Location badge colors (inline badges in cells)
const LOC_BADGE = {
  E: { color: "#b45309", bg: "rgba(245,158,11,0.10)", border: "#f59e0b", label: "E" }, // amber
  W: { color: "#0369a1", bg: "rgba(2,132,199,0.10)", border: "#0284c7", label: "W" },  // blue
  "-": { color: "#64748b", bg: "rgba(100,116,139,0.10)", border: "#94a3b8", label: "-" }, // gray
} as const;

// Subjob status badge colors
const STATUS_BADGE = {
  Started: {
    color: "#16a34a",
    bg: "rgba(22,163,74,0.10)",
    border: "#16a34a",
    label: "Started",
  },
  "Not Started": {
    color: "#64748b",
    bg: "rgba(100,116,139,0.10)",
    border: "#94a3b8",
    label: "Not Started",
  },
} as const;

/* ──────────────────────────────────────────────────────────────────────────────
   Subjobs table
   ──────────────────────────────────────────────────────────────────────────── */
function SubjobsTable({
  rows,
  onSelectRow,
  selectedId,
}: {
  rows: MondaySubjobT[];
  onSelectRow: (id: string) => void;
  selectedId: string | null;
}) {
  const columns = React.useMemo<ColumnDef<MondaySubjobT>[]>(
    () => [
      { header: "Subitem", accessorKey: "name" },
      {
        header: "Op #",
        accessorKey: "opNo",
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return <span className="tabular-nums">{v.toFixed(1)}</span>;
        },
      },
      { header: "Resource", accessorKey: "resource" },
      {
        header: "Location",
        accessorKey: "location",
        cell: ({ getValue }) => {
          const v = getValue<MondaySubjobT["location"]>();
          const b = LOC_BADGE[v];
          return (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-xs font-medium"
              style={{ color: b.color, background: b.bg, borderColor: b.border }}
            >
              {b.label}
            </Badge>
          );
        },
      },
      {
        header: "Timeline",
        cell: ({ row }) => {
          const s = row.original;
          const start = new Date(s.dueAt.getTime() - days(s.durationDays));
          return (
            <div className="flex flex-col items-stretch gap-1">
              <span className="text-xs text-muted-foreground">{fmtDate(start)}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(s.dueAt)}</span>
            </div>
          );
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => {
          const v = getValue<MondaySubjobT["status"]>();
          const b = STATUS_BADGE[v];
          return (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-xs font-medium"
              style={{ color: b.color, background: b.bg, borderColor: b.border }}
            >
              {b.label}
            </Badge>
          );
        },
      },
      { header: "Duration", accessorKey: "durationDays" },
      { header: "Recovery", accessorKey: "recoveryDays" },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-auto rounded-md border" role="region" aria-label="Subjobs">
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
          {table.getRowModel().rows.map((r) => {
            const loc = r.original.location;
            const isSel = selectedId === r.original.id;
            const tint = LOC_TINT[loc];
            return (
              <TableRow
                key={r.id}
                role="row"
                aria-selected={isSel}
                onClick={() => onSelectRow(r.original.id)}
                className="cursor-pointer"
                style={
                  isSel
                    ? {
                        background: tint.bg,
                        boxShadow: `inset 4px 0 0 0 ${tint.border}`,
                      }
                    : undefined
                }
              >
                {r.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>No subjobs.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Virtualized list of Jobs per pane
   - No fixed widths → no horizontal scrolling
   - Dense headers: smaller text, tight line-height, gap-1, allow wrap
   - Header & rows share the same 17-track grid and alignment
   ──────────────────────────────────────────────────────────────────────────── */
function JobsVirtualList({
  jobs,
  side,
  onOpenComments,
}: {
  jobs: MondayJobT[];
  side: "left" | "right"; // which sheet to open
  onOpenComments: (seedKey: string) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => parentRef.current,
    count: jobs.length,
    estimateSize: () => 128,
    overscan: 8,
    getItemKey: (index) => jobs[index]!.id, // stable identity
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const [openItem, setOpenItem] = React.useState<string>("");
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = React.useState<string | null>(null);

  const handleRowKeyDown = React.useCallback(
    (e: React.KeyboardEvent, jobId: string, rowKey: string) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-role='chevron-trigger']") ||
        target.closest("[data-role='job-button']")
      ) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedJobId(jobId);
        setSelectedSubId(null);
        onOpenComments(`job-${jobId}`); // keyboard opens comments too
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setOpenItem(openItem === rowKey ? "" : rowKey);
      }
    },
    [openItem, onOpenComments],
  );

  return (
    <div className="relative h-[560px] rounded-md border" role="region" aria-label={`Jobs ${side}`}>
      {/* Sticky header (dense, aligned, no overflow) */}
      <div className="sticky top-0 z-10 border-b bg-background" role="presentation">
        <div className="grid grid-cols-17 gap-1 px-2 py-2 text-[12px] font-semibold leading-[1.1] text-muted-foreground">
          <div className="col-span-1" /> {/* Chevron placeholder */}
          <div className="col-span-3 whitespace-normal text-left">Job</div>
          <div className="col-span-3 whitespace-normal text-left">Cust.</div>
          <div className="col-span-3 whitespace-normal text-left">Timeline</div>
          <div className="col-span-2 whitespace-normal text-right">Op #</div>
          <div className="col-span-3 whitespace-normal text-center">Resource</div>
          <div className="col-span-1 whitespace-normal text-center">Loc.</div>
          <div className="col-span-1 whitespace-normal text-right">TTR</div>
        </div>
      </div>

      {/* Virtual viewport */}
      <div
        ref={parentRef}
        className="h-[calc(560px-40px)] overflow-auto"
        role="grid"
        aria-rowcount={jobs.length}
        aria-label={`Jobs list ${side}`}
      >
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
            const isOpen = openItem === key;
            const isSelected = selectedJobId === job.id;
            const tint = LOC_TINT[job.location];

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
                  onValueChange={(v) => setOpenItem(v)}
                  className="w-full"
                >
                  <AccordionItem value={key} className="border-0">
                    {/* Row summary line (shares the same grid) */}
                    <div
                      className="grid grid-cols-17 items-center gap-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      role="button"
                      aria-label={`Open comments for ${job.id}`}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onKeyDown={(e) => handleRowKeyDown(e, job.id, key)}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("[data-role='chevron-trigger']") ||
                          target.closest("[data-role='job-button']")
                        ) {
                          return;
                        }
                        // Highlight and open comments
                        setSelectedJobId(job.id);
                        setSelectedSubId(null);
                        onOpenComments(`job-${job.id}`);
                      }}
                      style={
                        isSelected
                          ? {
                              background: tint.bg,
                              boxShadow: `inset 4px 0 0 0 ${tint.border}`,
                            }
                          : undefined
                      }
                    >
                      {/* Chevron */}
                      <div className="col-span-1 flex items-center justify-center">
                        <AccordionPrimitive.Header asChild>
                          <AccordionPrimitive.Trigger
                            data-role="chevron-trigger"
                            className="group inline-flex h-5 w-5 items-center justify-center rounded p-0 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          </AccordionPrimitive.Trigger>
                        </AccordionPrimitive.Header>
                      </div>

                      {/* Job ID (left) */}
                      <div className="col-span-3 text-left">
                        <button
                          type="button"
                          data-role="job-button"
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setSelectedSubId(null);
                            onOpenComments(`job-${job.id}`);
                          }}
                          className="text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          title={`Open comments for ${job.id}`}
                        >
                          {job.id}
                        </button>
                      </div>

                      {/* Cust. (truncate within its 3 tracks) */}
                      <div className="col-span-3 text-left text-sm truncate" title={job.customer}>
                        {job.customer}
                      </div>

                      {/* Timeline (stacked dates) */}
                      <div className="col-span-3 text-left">
                        <JobTimeline start={job.timelineStart} end={job.timelineEnd} />
                      </div>

                      {/* Op # (right) */}
                      <div className="col-span-2 text-right text-sm tabular-nums">
                        {job.opNo.toFixed(1)}
                      </div>

                      {/* Resrc. (center) */}
                      <div className="col-span-3 text-center text-sm">{job.resource}</div>

                      {/* Loc. (center) — BADGE */}
                      <div className="col-span-1 text-left">
                        {(() => {
                          const b = LOC_BADGE[job.location];
                          return (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-xs font-medium"
                              style={{ color: b.color, background: b.bg, borderColor: b.border }}
                            >
                              {b.label}
                            </Badge>
                          );
                        })()}
                      </div>

                      {/* TTR (right) — number only */}
                      <div className="col-span-1 text-right text-sm">{job.totalRecoveryDays}</div>
                    </div>

                    <AccordionContent className="pb-3">
                      <SubjobsTable
                        rows={job.subjobs}
                        onSelectRow={(id) => {
                          setSelectedSubId(id);
                          setSelectedJobId(null);
                        }}
                        selectedId={selectedSubId}
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

/* ──────────────────────────────────────────────────────────────────────────────
   Main Monday layout
   ──────────────────────────────────────────────────────────────────────────── */
export default function MondayDashboard() {
  const jobs = React.useMemo(() => makeJobs("monday-jobs-seed", 60), []);
  const { active, pastDue } = React.useMemo(() => splitJobs(jobs), [jobs]);

  // Comments cache (Jobs only)
  const commentsCache = React.useRef(new Map<string, CommentT[]>());
  const [sheetOpenRight, setSheetOpenRight] = React.useState(false);
  const [sheetOpenLeft, setSheetOpenLeft] = React.useState(false);
  const [sheetTitle, setSheetTitle] = React.useState("Comments");
  const [sheetComments, setSheetComments] = React.useState<CommentT[]>([]);

  const openComments = React.useCallback(
    (seedKey: string, side: "left" | "right", title: string) => {
      if (!commentsCache.current.has(seedKey)) {
        commentsCache.current.set(seedKey, makeComments(seedKey));
      }
      setSheetTitle(title);
      setSheetComments(commentsCache.current.get(seedKey)!);
      if (side === "right") setSheetOpenRight(true);
      else setSheetOpenLeft(true);
    },
    [],
  );

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
            {/* spacer to mirror Past Due header height */}
            <div className="invisible flex items-baseline gap-2">
              <span className="text-xs uppercase text-muted-foreground">TTR</span>
              <span className="text-lg font-semibold">0</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <JobsVirtualList
            jobs={active}
            side="right"
            onOpenComments={(seed) => openComments(seed, "right", "Active Run Comments")}
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
              <span className="text-lg font-semibold">{totalTTRPastDue}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <JobsVirtualList
            jobs={pastDue}
            side="left"
            onOpenComments={(seed) => openComments(seed, "left", "Past Due Comments")}
          />
        </CardContent>
      </Card>

      {/* Sheets (Jobs only) */}
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