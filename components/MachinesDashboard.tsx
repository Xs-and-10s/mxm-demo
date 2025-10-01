"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable, { type Machine } from "@/components/DataTable";
import MetricBarChart from "@/components/MetricBarChart";
import FleetSparkline from "@/components/FleetSparkline";
import FadeOnChange from "@/components/FadeOnChange";

/* ----------------------------
   Base dataset and deterministic 4-week trends
----------------------------- */

const BASE: Machine[] = [
  { machineId: "605", status: "Running", timeDownMinutes: 0,   project: "In-House", mtbfHours: 260, mttrHours: 1.2 },
  { machineId: "606", status: "Down",    timeDownMinutes: 125, project: "In-House", mtbfHours: 95,  mttrHours: 3.8 },
  { machineId: "607", status: "Running", timeDownMinutes: 0,   project: "Subcom",   mtbfHours: 280, mttrHours: 1.0 },
  { machineId: "608", status: "Down",    timeDownMinutes: 45,  project: "Subcom",   mtbfHours: 140, mttrHours: 2.6 },
  // CHANGED: 609 is now Down (took 610's downtime), 610 is Running (took 609's 0m)
  { machineId: "609", status: "Down",    timeDownMinutes: 180, project: "Subcom",   mtbfHours: 240, mttrHours: 1.5 },
  { machineId: "610", status: "Running", timeDownMinutes: 0,   project: "Subcom",   mtbfHours: 110, mttrHours: 4.1 },
  { machineId: "611", status: "Running", timeDownMinutes: 0,   project: "In-House", mtbfHours: 220, mttrHours: 1.7 },
];

// Simple seeded RNG so the demo is stable across reloads
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type TrendOpts = { driftPct: number; noisePct: number; min: number; max: number };

function makeTrend(current: number, seedKey: string, { driftPct, noisePct, min, max }: TrendOpts) {
  const rand = seedRng(seedKey);
  const weeks = 4;
  let base = current * (1 - driftPct * 0.5);
  const arr: number[] = [];
  for (let i = weeks; i >= 1; i--) {
    const driftFactor = 1 + driftPct * i;
    const noise = (rand() * 2 - 1) * noisePct;
    const val = clamp(base * driftFactor * (1 + noise), min, max);
    arr.push(Number(val.toFixed(1)));
  }
  return arr;
}

// Enrich with 4-week trends
const MACHINES: Machine[] = BASE.map((m) => {
  const seedBase = `${m.machineId}-${m.project}`;
  const mtbfOpts: TrendOpts =
    m.status === "Running"
      ? { driftPct: 0.01, noisePct: 0.05, min: 60, max: 360 }
      : { driftPct: -0.03, noisePct: 0.07, min: 40, max: 320 };
  const mttrOpts: TrendOpts =
    m.status === "Running"
      ? { driftPct: -0.03, noisePct: 0.06, min: 0.6, max: 5.0 }
      : { driftPct: 0.05, noisePct: 0.08, min: 0.6, max: 5.0 };
  return {
    ...m,
    mtbfTrend: makeTrend(m.mtbfHours, `${seedBase}-mtbf`, mtbfOpts),
    mttrTrend: makeTrend(m.mttrHours, `${seedBase}-mttr`, mttrOpts),
  };
});

/* ----------------------------
   Legend helpers
----------------------------- */

function LegendSwatchSquare({
  color,
  stroke,
  label,
}: { color: string; stroke: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-3 w-3"
        style={{ backgroundColor: color, border: `1px solid ${stroke}` }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-[2px] w-6"
        style={{
          backgroundImage: `linear-gradient(to right, ${color} 50%, rgba(0,0,0,0) 0%)`,
          backgroundSize: "6px 2px",
          backgroundRepeat: "repeat-x",
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
function LegendSolidLine({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-[2px] w-6" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

/* ----------------------------
   Dashboard
----------------------------- */

export default function MachinesDashboard() {
  const [filter, setFilter] = React.useState("");
  const [visibleMachines, setVisibleMachines] = React.useState<Machine[]>(MACHINES);

  // Selected machine for cross-highlight
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Chips
  const [projS, setProjS] = React.useState(true);
  const [projI, setProjI] = React.useState(true);

  // Chips filter the dataset passed INTO the table
  const tableInput = React.useMemo(
    () =>
      MACHINES.filter(
        (m) =>
          (projS && m.project === "Subcom") ||
          (projI && m.project === "In-House"),
      ),
    [projS, projI],
  );

  // If selection falls out of view, clear it
  React.useEffect(() => {
    if (!selectedId) return;
    const stillVisible = visibleMachines.some((m) => m.machineId === selectedId);
    if (!stillVisible) setSelectedId(null);
  }, [visibleMachines, selectedId]);

  // Match charts column height to the unfiltered table
  const tableContentRef = React.useRef<HTMLDivElement>(null);
  const [baselineHeight, setBaselineHeight] = React.useState<number>(560);

  React.useEffect(() => {
    const el = tableContentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const chipsAll = projS && projI;
      const isUnfiltered =
        chipsAll && filter.trim() === "" && visibleMachines.length === MACHINES.length;
      if (isUnfiltered) {
        const h = Math.max(360, Math.round(rect.height));
        setBaselineHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [filter, visibleMachines.length, projS, projI]);

  const resetAll = React.useCallback(() => {
    setFilter("");
    setProjS(true);
    setProjI(true);
    setSelectedId(null);
  }, []);

  const chartGap = 16;
  const eachChartHeight = Math.max(200, Math.floor((baselineHeight - chartGap) / 2));

  // Fade deps: chips, filter, visible machine signature, selection
  const fadeDeps = React.useMemo(() => {
    const sig = visibleMachines
      .map((m) => `${m.machineId}:${m.mtbfHours}:${m.mttrHours}`)
      .join("\n");
    return [filter, projS, projI, sig, selectedId];
  }, [filter, projS, projI, visibleMachines, selectedId]);

  // Small UI helper
  function ChipToggle({
    label,
    color,
    active,
    onClick,
  }: {
    label: string;
    color: string;
    active: boolean;
    onClick: () => void;
  }) {
    return (
      <Button
        type="button"
        onClick={onClick}
        size="sm"
        variant={active ? "default" : "outline"}
        className="rounded-full gap-2"
        aria-pressed={active}
        aria-label={`Toggle ${label}`}
        title={label}
      >
        <span className="inline-block h-2.5 w-2.5" style={{ background: color }} />
        {label}
      </Button>
    );
  }

  return (
    <main>
      {/* Two-column: Table (left), Charts (right) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* LEFT: DataTable */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Machines</CardTitle>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {/* Keep Subcom blue */}
                  <ChipToggle
                    label="Subcom"
                    color="#0284c7"
                    active={projS}
                    onClick={() => setProjS((v) => !v)}
                  />
                  {/* In-House yellow */}
                  <ChipToggle
                    label="In-House"
                    color="#f59e0b"
                    active={projI}
                    onClick={() => setProjI((v) => !v)}
                  />
                </div>
                <Button variant="outline" onClick={resetAll} className="shrink-0">
                  Reset filters
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent ref={tableContentRef}>
            <DataTable
              data={tableInput}
              filter={filter}
              onFilterChange={setFilter}
              onVisibleDataChange={setVisibleMachines}
              selectedMachineId={selectedId ?? undefined}
            />
          </CardContent>
        </Card>

        {/* RIGHT: Charts column (MTBF + MTTR) */}
        <div className="flex flex-col gap-4">
          {/* MTBF */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>MTBF (hours)</CardTitle>
                <FadeOnChange deps={fadeDeps}>
                  <FleetSparkline machines={visibleMachines} metric="mtbf" />
                </FadeOnChange>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <FadeOnChange deps={fadeDeps}>
                <MetricBarChart
                  machines={visibleMachines}
                  metric="mtbf"
                  height={eachChartHeight}
                  onBarClick={(id) =>
                    setSelectedId((prev) => (prev === id ? null : id))
                  }
                />
              </FadeOnChange>

              {/* Legend (updated labels) */}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <LegendSwatchSquare
                  color="rgba(22,163,74,0.35)"
                  stroke="#16a34a"
                  label="Improved"
                />
                <LegendSwatchSquare
                  color="rgba(239,68,68,0.35)"
                  stroke="#ef4444"
                  label="Worsened"
                />
                <LegendLine color="#64748b" label="Past 4-wk Overall" />
                <LegendSolidLine color="#64748b" label="4-wk Window" />
              </div>
            </CardContent>
          </Card>

          {/* MTTR */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>MTTR (hours)</CardTitle>
                <FadeOnChange deps={fadeDeps}>
                  <FleetSparkline machines={visibleMachines} metric="mttr" />
                </FadeOnChange>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <FadeOnChange deps={fadeDeps}>
                <MetricBarChart
                  machines={visibleMachines}
                  metric="mttr"
                  height={eachChartHeight}
                  onBarClick={(id) =>
                    setSelectedId((prev) => (prev === id ? null : id))
                  }
                />
              </FadeOnChange>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
