"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable, { type Machine } from "@/components/DataTable";
import MtbfMttrScatter from "@/components/MtbfMttrScatter";

// Canonical dataset (shared by table & chart)
// MTBF (h) ~100–300; MTTR (h) ~1.0–4.5 (down machines trend higher MTTR)
const MACHINES: Machine[] = [
  { machineId: "S-101", status: "Running", timeDownMinutes: 0,   project: "S", mtbfHours: 260, mttrHours: 1.2 },
  { machineId: "S-102", status: "Down",    timeDownMinutes: 125, project: "S", mtbfHours: 95,  mttrHours: 3.8 },
  { machineId: "S-103", status: "Running", timeDownMinutes: 0,   project: "S", mtbfHours: 280, mttrHours: 1.0 },
  { machineId: "S-104", status: "Down",    timeDownMinutes: 45,  project: "S", mtbfHours: 140, mttrHours: 2.6 },
  { machineId: "I-201", status: "Running", timeDownMinutes: 0,   project: "I", mtbfHours: 240, mttrHours: 1.5 },
  { machineId: "I-202", status: "Down",    timeDownMinutes: 180, project: "I", mtbfHours: 110, mttrHours: 4.1 },
  { machineId: "I-203", status: "Running", timeDownMinutes: 0,   project: "I", mtbfHours: 220, mttrHours: 1.7 },
];

export default function MachinesDashboard() {
  const [filter, setFilter] = React.useState("");
  const [visibleMachines, setVisibleMachines] = React.useState<Machine[]>(MACHINES);

  // Chips (interactive legend)
  const [showS, setShowS] = React.useState(true);
  const [showI, setShowI] = React.useState(true);

  // Targets for quadrant shading
  const MTBF_TARGET = 200; // hours
  const MTTR_TARGET = 2.0; // hours

  // Measure the unfiltered table content height and lock the chart to it
  const tableContentRef = React.useRef<HTMLDivElement>(null);
  const [baselineChartHeight, setBaselineChartHeight] = React.useState<number>(360);

  React.useEffect(() => {
    const el = tableContentRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      const isUnfiltered =
        filter.trim() === "" && visibleMachines.length === MACHINES.length;

      // Only update baseline when the table is unfiltered
      if (isUnfiltered) {
        // Add a tiny buffer to account for borders/padding rounding
        const h = Math.max(240, Math.round(rect.height));
        setBaselineChartHeight(h);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [filter, visibleMachines.length]);

  // Reset button: clears table filter and re-enables chips
  const resetAll = React.useCallback(() => {
    setFilter("");
    setShowS(true);
    setShowI(true);
  }, []);

  return (
    <main className="p-6">
      {/* Two-column layout: Table (left), Scatter (right) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* LEFT: DataTable */}
        <Card className="h-fit">
          <CardHeader className="flex items-center justify-between gap-4">
            <CardTitle>Machines</CardTitle>
            <Button variant="outline" onClick={resetAll}>
              Reset filters
            </Button>
          </CardHeader>
          <CardContent ref={tableContentRef}>
            <DataTable
              data={MACHINES}
              filter={filter}
              onFilterChange={setFilter}
              onVisibleDataChange={setVisibleMachines}
            />
          </CardContent>
        </Card>

        {/* RIGHT: Scatter Plot */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>MTBF vs MTTR</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Scatter plot uses the <strong>same filtered machines</strong> shown on the left.
                </p>
              </div>
              {/* Chips to toggle Project S/I visibility */}
              <div className="flex items-center gap-2">
                <ChipToggle
                  label="Project S"
                  color="#0284c7"
                  active={showS}
                  onClick={() => setShowS((v) => !v)}
                />
                <ChipToggle
                  label="Project I"
                  color="#16a34a"
                  active={showI}
                  onClick={() => setShowI((v) => !v)}
                />
              </div>
            </div>
          </CardHeader>
          {/* Lock chart content height to the unfiltered table's content height */}
          <CardContent className="pt-0" style={{ height: baselineChartHeight }}>
            <MtbfMttrScatter
              machines={visibleMachines}
              showS={showS}
              showI={showI}
              mtbfTarget={MTBF_TARGET}
              mttrTarget={MTTR_TARGET}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

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
    >
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </Button>
  );
}
