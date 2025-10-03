"use client";

import * as React from "react";
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { type Machine } from "@/components/DataTable";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  S: { label: "Project S", color: "hsl(var(--chart-1))" },
  I: { label: "Project I", color: "hsl(var(--chart-2))" },
  mtbf: { label: "MTBF (hours)" },
  mttr: { label: "MTTR (hours)" },
} satisfies ChartConfig;

type Props = {
  machines: Machine[];    // already filtered/sorted list from the table
  showS: boolean;
  showI: boolean;
  mtbfTarget: number;     // e.g., 200h
  mttrTarget: number;     // e.g., 2h
};

type Pt = {
  machineId: string;
  project: "S" | "I";
  mtbfHours: number;
  mttrHours: number;
  r?: number;
};

export default function MtbfMttrScatter({
  machines,
  showS,
  showI,
  mtbfTarget,
  mttrTarget,
}: Props) {
  // Resolve CSS vars to concrete colors so points always render in SVG
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [colors, setColors] = React.useState<{ S: string; I: string }>({
    S: "#0284c7", // sky-600 fallback
    I: "#16a34a", // green-600 fallback
  });
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const colS = (cs.getPropertyValue("--color-S") || "").trim();
    const colI = (cs.getPropertyValue("--color-I") || "").trim();
    setColors({ S: colS || "#0284c7", I: colI || "#16a34a" });
  }, []);

  const points: Pt[] = React.useMemo(
    () =>
      machines.map((m) => ({
        machineId: m.machineId,
        project: m.project,
        mtbfHours: m.mtbfHours,
        mttrHours: m.mttrHours,
        r: 5, // dot radius for consistent sizing
      })),
    [machines]
  );

  const dataS = points.filter((p) => p.project === "S");
  const dataI = points.filter((p) => p.project === "I");

  // --- Domains with gentle padding ---
  const mtbfVals = points.map((p) => p.mtbfHours);
  const mttrVals = points.map((p) => p.mttrHours);
  const xMin = mtbfVals.length ? Math.max(0, Math.min(...mtbfVals) - 10) : 0;
  const xMax = mtbfVals.length ? Math.max(...mtbfVals) + 30 : mtbfTarget + 30;
  const yMin = mttrVals.length ? Math.max(0, Math.min(...mttrVals) - 0.5) : 0;
  const yMax = mttrVals.length ? Math.max(...mttrVals) + 0.8 : mttrTarget + 1;

  // --- Helpers for IQR/outlier detection ---
  const quantile = (arr: number[], q: number) => {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const pos = (s.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (s[base + 1] !== undefined) {
      return s[base] + rest * (s[base + 1] - s[base]);
    }
    return s[base];
  };

  const mtbfQ1 = quantile(mtbfVals, 0.25);
  const mtbfQ3 = quantile(mtbfVals, 0.75);
  const mtbfIQR = mtbfQ3 - mtbfQ1;
  const mtbfLowCut = mtbfQ1 - 1.5 * mtbfIQR; // low MTBF outlier

  const mttrQ1 = quantile(mttrVals, 0.25);
  const mttrQ3 = quantile(mttrVals, 0.75);
  const mttrIQR = mttrQ3 - mttrQ1;
  const mttrHighCut = mttrQ3 + 1.5 * mttrIQR; // high MTTR outlier

  const isOutlier = (p: Pt) =>
    (mtbfVals.length >= 4 && p.mtbfHours < mtbfLowCut) ||
    (mttrVals.length >= 4 && p.mttrHours > mttrHighCut);

  // --- Best & worst performers by reliability index (mtbf/mttr) ---
  const withScore = points.map((p) => ({
    ...p,
    score: p.mttrHours > 0 ? p.mtbfHours / p.mttrHours : Number.POSITIVE_INFINITY,
  }));
  const best = withScore.length
    ? withScore.reduce((a, b) => (b.score > a.score ? b : a))
    : undefined;
  const worst = withScore.length
    ? withScore.reduce((a, b) => (b.score < a.score ? b : a))
    : undefined;

  // --- Project centroids (means) ---
  const mean = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  const centroidS =
    dataS.length > 0
      ? {
          x: mean(dataS.map((p) => p.mtbfHours)),
          y: mean(dataS.map((p) => p.mttrHours)),
        }
      : undefined;
  const centroidI =
    dataI.length > 0
      ? {
          x: mean(dataI.map((p) => p.mtbfHours)),
          y: mean(dataI.map((p) => p.mttrHours)),
        }
      : undefined;

  // Guards for chip visibility on annotations
  const isVisibleProject = (proj: "S" | "I") =>
    (proj === "S" && showS) || (proj === "I" && showI);

  return (
    <div ref={containerRef} className="w-full h-full">
      {/* ChartContainer must have exactly one child */}
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 16 }}>
            {/* Quadrant shading (behind points) */}
            <ReferenceArea
              x1={xMin}
              x2={mtbfTarget}
              y1={yMin}
              y2={mttrTarget}
              fill="rgba(234,179,8,0.08)" // amber-400 @ 8%
              stroke="none"
            />
            <ReferenceArea
              x1={mtbfTarget}
              x2={xMax}
              y1={yMin}
              y2={mttrTarget}
              fill="rgba(22,163,74,0.08)" // green-600 @ 8%
              stroke="none"
            />
            <ReferenceArea
              x1={xMin}
              x2={mtbfTarget}
              y1={mttrTarget}
              y2={yMax}
              fill="rgba(239,68,68,0.10)" // red-500 @ 10%
              stroke="none"
            />
            <ReferenceArea
              x1={mtbfTarget}
              x2={xMax}
              y1={mttrTarget}
              y2={yMax}
              fill="rgba(239,68,68,0.06)" // red-500 @ 6%
              stroke="none"
            />

            {/* Grid & axes */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="mtbfHours"
              name="MTBF"
              unit="h"
              domain={[xMin, xMax]}
              tickLine={false}
              axisLine={false}
              label={{ value: "MTBF (hours)", position: "insideBottom", offset: -10 }}
            />
            <YAxis
              type="number"
              dataKey="mttrHours"
              name="MTTR"
              unit="h"
              domain={[yMin, yMax]}
              tickLine={false}
              axisLine={false}
              width={56}
              label={{ value: "MTTR (hours)", angle: -90, position: "insideLeft" }}
            />

            {/* Target lines with labels */}
            <ReferenceLine
              x={mtbfTarget}
              stroke="rgba(2,132,199,0.6)" // sky-600
              strokeDasharray="4 4"
              label={{
                value: `MTBF target: ${mtbfTarget} h`,
                position: "insideTopRight",
                fill: "rgba(2,132,199,0.9)",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={mttrTarget}
              stroke="rgba(220,38,38,0.6)" // red-600
              strokeDasharray="4 4"
              label={{
                value: `MTTR target: ${mttrTarget} h`,
                position: "insideTopRight",
                fill: "rgba(220,38,38,0.9)",
                fontSize: 12,
              }}
            />

            {/* Tooltip */}
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                const d = p.payload as {
                  machineId: string;
                  project: "S" | "I";
                  mtbfHours: number;
                  mttrHours: number;
                };
                return (
                  <div className="rounded-md border bg-background p-2 text-sm shadow">
                    <div className="font-medium">{d.machineId}</div>
                    <div className="text-muted-foreground">Project {d.project}</div>
                    <div>MTBF: <strong>{d.mtbfHours} h</strong></div>
                    <div>MTTR: <strong>{d.mttrHours} h</strong></div>
                  </div>
                );
              }}
            />

            {/* Series */}
            <Scatter
              name="Project S"
              data={dataS}
              fill={colors.S}
              stroke={colors.S}
              shape="circle"
              legendType="circle"
              isAnimationActive={false}
              hide={!showS}
            />
            <Scatter
              name="Project I"
              data={dataI}
              fill={colors.I}
              stroke={colors.I}
              shape="circle"
              legendType="circle"
              isAnimationActive={false}
              hide={!showI}
            />

            {/* --- Data-driven annotations --- */}

            {/* Centroids per project (only if project is visible) */}
            {centroidS && showS && (
              <ReferenceDot
                x={centroidS.x}
                y={centroidS.y}
                r={8}
                fill={colors.S}
                fillOpacity={0.15}
                stroke={colors.S}
                strokeDasharray="3 3"
                label={{
                  value: "S centroid",
                  position: "top",
                  fill: colors.S,
                  fontSize: 12,
                }}
              />
            )}
            {centroidI && showI && (
              <ReferenceDot
                x={centroidI.x}
                y={centroidI.y}
                r={8}
                fill={colors.I}
                fillOpacity={0.15}
                stroke={colors.I}
                strokeDasharray="3 3"
                label={{
                  value: "I centroid",
                  position: "top",
                  fill: colors.I,
                  fontSize: 12,
                }}
              />
            )}

            {/* Best performer (max MTBF/MTTR) */}
            {best && isVisibleProject(best.project) && (
              <ReferenceDot
                x={best.mtbfHours}
                y={best.mttrHours}
                r={10}
                fill="rgba(34,197,94,0.18)" // green-500 @ 18%
                stroke="rgb(34,197,94)"
                label={{
                  value: `Best — ${best.machineId}`,
                  position: "right",
                  fill: "rgb(34,197,94)",
                  fontSize: 12,
                }}
              />
            )}

            {/* Worst performer (min MTBF/MTTR) */}
            {worst && isVisibleProject(worst.project) && (
              <ReferenceDot
                x={worst.mtbfHours}
                y={worst.mttrHours}
                r={10}
                fill="rgba(239,68,68,0.18)" // red-500 @ 18%
                stroke="rgb(239,68,68)"
                label={{
                  value: `Worst — ${worst.machineId}`,
                  position: "right",
                  fill: "rgb(239,68,68)",
                  fontSize: 12,
                }}
              />
            )}

            {/* Outliers (ring annotations) */}
            {points
              .filter((p) => isOutlier(p) && isVisibleProject(p.project))
              .map((p) => (
                <ReferenceDot
                  key={`outlier-${p.machineId}`}
                  x={p.mtbfHours}
                  y={p.mttrHours}
                  r={9}
                  fill="transparent"
                  stroke="rgb(245,158,11)" // amber-500
                  strokeWidth={2}
                  label={{
                    value: `Outlier — ${p.machineId}`,
                    position: "top",
                    fill: "rgb(245,158,11)",
                    fontSize: 12,
                  }}
                />
              ))}
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
