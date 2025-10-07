"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
// import type { Machine } from "@/components/DataTable";
import type { MachineT } from "@/domain/machine";

// ---- Colors
const GRAY = "#6b7280"; // gray-500
const GREEN_FILL = "rgba(22,163,74,0.35)"; // green overlay
const RED_FILL = "rgba(239,68,68,0.35)";   // red overlay
const GREEN_STROKE = "#16a34a";
const RED_STROKE = "#ef4444";
const FLEET_LINE = "#64748b"; // slate-500
const A11Y_TICK = "#334155";  // slate-700 (x-axis labels)

// Project badge palette (stroke-only badges use the 'bg' as a lighter stroke)
const PROJ = {
  Subcom: { bg: "rgba(2,132,199,0.25)", stroke: "#0284c7" },
  "In-House": { bg: "rgba(245,158,11,0.35)", stroke: "#f59e0b" },
} as const;

// ---- Config
const chartConfig = {
  mtbf: { label: "MTBF (hours)", color: "hsl(var(--chart-1))" },
  mttr: { label: "MTTR (hours)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

type Metric = "mtbf" | "mttr";

type Props = {
  machines: MachineT[];
  metric: Metric;
  height: number;
  barSize?: number;
  onBarClick?: (machineId: string) => void;
};

// ---- Helpers
function histAvg(arr?: number[]) {
  if (!arr || arr.length === 0) return undefined;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function fmt(n: unknown) {
  if (n == null || !isFinite(Number(n))) return "—";
  const val = Math.round(Number(n) * 100) / 100;
  return Number.isInteger(val) ? String(Math.round(val)) : val.toFixed(2);
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: [number, number, number, number],
) {
  const [tl, tr, br, bl] = r.map((v) => Math.max(0, Math.min(v, w / 2, h / 2))) as [
    number, number, number, number
  ];
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    `A${tr},${tr} 0 0 1 ${x + w},${y + tr}`,
    `V${y + h - br}`,
    `A${br},${br} 0 0 1 ${x + w - br},${y + h}`,
    `H${x + bl}`,
    `A${bl},${bl} 0 0 1 ${x},${y + h - bl}`,
    `V${y + tl}`,
    `A${tl},${tl} 0 0 1 ${x + tl},${y}`,
    "Z",
  ].join(" ");
}

/**
 * Single custom shape that draws:
 *  - base gray bar (current)
 *  - colored overlay (hist), sized relative to yMin/current scale
 * Animates on mount with CSS transform (scaleY) + overlay opacity.
 */
function OverlayBarShape(props: any) {
  const {
    x, y, width, height, index, payload,
    // extra props passed from parent Bar
    yMin, metric, reduce, baseDur = 380, staggerMs = 40,
  } = props;

  const current = payload.current as number | undefined;
  const hist = payload.hist as number | undefined;
  if (typeof current !== "number" || isNaN(current)) return null;

  // Map hist value into this bar's coordinate space
  const bottom = y + height;
  const k = current > yMin && height > 0 ? height / (current - yMin) : 0;
  const histHeight = typeof hist === "number" && k ? Math.max(0, (hist - yMin) * k) : 0;
  const histY = bottom - histHeight;

  const better =
    typeof hist === "number"
      ? metric === "mtbf"
        ? current >= hist
        : current <= hist
      : undefined;
  const overlayFill = better == null ? null : better ? GREEN_FILL : RED_FILL;

  const radius: [number, number, number, number] = [6, 6, 0, 0];
  const basePath = roundedRectPath(x, y, width, height, radius);
  const overlayPath =
    typeof hist === "number" ? roundedRectPath(x, histY, width, histHeight, radius) : null;

  // Per-bar mount animation: scale up + fade overlay, staggered by index
  // biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
  const [mounted, setMounted] = React.useState(false);
  // biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
  React.useEffect(() => {
    // trigger on mount only; parent remounts this shape via Bar `key` to re-animate
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delay = index * staggerMs;
  const groupStyle: React.CSSProperties & { transformBox?: string } = reduce
    ? { transform: "none" }
    : {
        transformBox: "fill-box",
        transformOrigin: "center bottom",
        transform: mounted ? "scaleY(1)" : "scaleY(0.001)",
        transition: `transform ${baseDur}ms ease-out ${delay}ms`,
        willChange: "transform",
      };

  const overlayStyle: React.CSSProperties = reduce
    ? { opacity: 1 }
    : {
        opacity: mounted ? 1 : 0,
        transition: `opacity 180ms ease-in ${delay + baseDur + 40}ms`,
      };

  return (
    <g shapeRendering="crispEdges" style={groupStyle}>
      {/* Base gray */}
      <path d={basePath} fill={GRAY} />
      {/* Overlay */}
      {overlayPath && overlayFill ? (
        <path d={overlayPath} fill={overlayFill} style={overlayStyle} />
      ) : null}
    </g>
  );
}

// Tooltip (Current always first)
function MetricTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: any[];
  metric: Metric;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum =
    (payload[0]?.payload as { machineId: string; current: number; hist?: number }) ?? undefined;
  if (!datum) return null;

  const rows: { label: string; value: number; color: string }[] = [];
  rows.push({ label: "Current", value: datum.current, color: GRAY });
  if (typeof datum.hist === "number") {
    const better = metric === "mtbf" ? datum.current >= datum.hist : datum.current <= datum.hist;
    rows.push({
      label: "4-week history",
      value: datum.hist,
      color: better ? GREEN_STROKE : RED_STROKE,
    });
  }

  return (
    <div className="rounded-md border bg-background p-2 text-sm shadow">
      <div className="mb-1 font-medium">{datum.machineId}</div>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-6">
            <span style={{ color: r.color }}>{r.label}</span>
            <span style={{ color: r.color }}>{fmt(r.value)} h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MetricBarChart({
  machines,
  metric,
  height,
  barSize = 28,
  onBarClick,
}: Props) {
  // Keep table order; compute current + hist avg; include status & project (for ticks)
  const data = React.useMemo(() => {
    return machines.map((m) => {
      const current = metric === "mtbf" ? m.mtbfHours : m.mttrHours;
      const trendArr = metric === "mtbf" ? m.mtbfTrend : m.mttrTrend;
      const hist = histAvg(trendArr);
      return {
        machineId: m.machineId,
        project: m.project,
        status: m.status,
        current,
        hist,
        metric, // for overlay rule
      };
    });
  }, [machines, metric]);

  // For X-axis badges/text styling
  const statusById = React.useMemo(() => {
    const map = new Map<string, MachineT["status"]>();
    for (const d of data) map.set(d.machineId, d.status);
    return map;
  }, [data]);

  const projectById = React.useMemo(() => {
    const map = new Map<string, MachineT["project"]>();
    for (const d of data) map.set(d.machineId, d.project);
    return map;
  }, [data]);

  // Signature for remounting shapes when values change (so they re-animate)
  const animationKey = React.useMemo(
    () => data.map((d) => `${d.machineId}:${d.current}:${d.hist ?? ""}`).join("|"),
    [data],
  );

  // Fleet historical average
  const fleetHist = React.useMemo(() => {
    const vals = data.map((d) => d.hist).filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : undefined;
  }, [data]);

  // Y domain centered around fleet historical average
  const allVals = data
    .flatMap((d) => [d.current, d.hist ?? d.current])
    .filter((v): v is number => typeof v === "number");
  let yMin = 0;
  let yMax = 10;
  if (allVals.length) {
    if (typeof fleetHist === "number") {
      const maxAbove = Math.max(...allVals.map((v) => v - fleetHist));
      const maxBelow = Math.max(...allVals.map((v) => fleetHist - v));
      const span = Math.max(maxAbove, maxBelow) * 1.2 || 10;
      yMin = Math.max(0, Math.floor((fleetHist - span) * 100) / 100);
      yMax = Math.ceil((fleetHist + span) * 100) / 100;
      if (yMax <= yMin) yMax = yMin + 10;
    } else {
      const minV = Math.min(...allVals);
      const maxV = Math.max(...allVals);
      const pad = Math.max(5, (maxV - minV) * 0.15);
      yMin = Math.max(0, Math.floor((minV - pad) * 100) / 100);
      yMax = Math.ceil((maxV + pad) * 100) / 100;
      if (yMax <= yMin) yMax = yMin + 10;
    }
  }

  // Reduced motion
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReduce(!!mq?.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq?.addEventListener?.("change", handler);
    return () => mq?.removeEventListener?.("change", handler);
  }, []);

  // ---- Custom tick: project-colored "stroke-only" badge
  const TickBadge = React.useCallback(
    (props: any) => {
      const { x, y, payload } = props;
      const id = String(payload?.value ?? "");
      const status = statusById.get(id);
      const project: MachineT["project"] = projectById.get(id) ?? "Subcom";
      const palette = PROJ[project];
      const isDown = status === "Down";
      const textFill = isDown ? RED_STROKE : A11Y_TICK;
      const fontWeight = isDown ? 700 : 600;
      const label = id;

      const charW = 7; // approx px per char @ 12px font
      const padX = 8;
      const badgeW = Math.max(28, label.length * charW + padX * 2);
      const badgeH = 18;
      const rx = 9;
      const rectX = x - badgeW / 2;
      const rectY = y + 4; // push below tick baseline
      const textY = rectY + badgeH / 2 + 4;

      return (
        <g>
          <rect
            x={rectX}
            y={rectY}
            width={badgeW}
            height={badgeH}
            rx={rx}
            ry={rx}
            fill="none"
            stroke={palette.bg}
            strokeWidth={1.5}
          />
          <text
            x={x}
            y={textY}
            textAnchor="middle"
            style={{ fill: textFill, fontSize: 12, fontWeight }}
          >
            {label}
          </text>
        </g>
      );
    },
    [projectById, statusById],
  );

  const handleBarClick = React.useCallback(
    (_: any, index: number) => {
      const id = data[index]?.machineId;
      if (id) onBarClick?.(id);
    },
    [data, onBarClick],
  );

  return (
    <div className="w-full" style={{ height }}>
      <ChartContainer config={chartConfig as ChartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap={20}
            barGap={0}
            margin={{ top: 8, right: 16, left: 8, bottom: 36 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            {/* Project stroke-only badges + status-aware label color */}
            <XAxis dataKey="machineId" tickLine={false} axisLine={false} tickMargin={8} tick={TickBadge} />

            <YAxis
              type="number"
              domain={[yMin, yMax]}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={fmt}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />

            <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<MetricTooltip metric={metric} />} />

            {/* Single series; custom shape draws gray + overlay together */}
            <Bar
              key={animationKey}             // remount on data changes -> re-animate per bar
              dataKey="current"
              name={metric === "mtbf" ? "MTBF (h)" : "MTTR (h)"}
              barSize={barSize}
              isAnimationActive={false}      // we animate inside the shape
              onClick={handleBarClick}
              shape={(props: any) => (
                <OverlayBarShape
                  {...props}
                  yMin={yMin}
                  metric={metric}
                  reduce={reduce}
                />
              )}
            />

            {typeof fleetHist === "number" && (
              <ReferenceLine
                y={fleetHist}
                stroke={FLEET_LINE}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
