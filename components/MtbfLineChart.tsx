"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { type Machine } from "@/components/DataTable";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  S: { label: "Project S", color: "hsl(var(--chart-1))" },
  I: { label: "Project I", color: "hsl(var(--chart-2))" },
  mtbf: { label: "MTBF (hours)" },
} satisfies ChartConfig;

type Props = {
  machines: Machine[];      // already filtered/sorted by the table
  thresholdHours: number;   // e.g., 150
  showS: boolean;           // toggle Project S line
  showI: boolean;           // toggle Project I line
};

export default function MtbfLineChart({ machines, thresholdHours, showS, showI }: Props) {
  // Prepare x-axis category data
  const data = React.useMemo(() => {
    return machines.map((m) => ({
      machineId: m.machineId,
      S: m.project === "S" ? m.mtbfHours : null,
      I: m.project === "I" ? m.mtbfHours : null,
    }));
  }, [machines]);

  const values = machines.map((m) => m.mtbfHours);
  const maxVal = values.length ? Math.max(...values, thresholdHours) : thresholdHours;
  const minVal = 0;
  const yPadding = 40;

  const avg =
    values.length > 0
      ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
      : 0;

  // ---- Resolve CSS vars to concrete colors so SVG stroke/fill are guaranteed visible ----
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [colors, setColors] = React.useState<{ S: string; I: string }>({
    S: "#0284c7", // fallback (sky-600)
    I: "#16a34a", // fallback (green-600)
  });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const colS = (cs.getPropertyValue("--color-S") || "").trim();
    const colI = (cs.getPropertyValue("--color-I") || "").trim();
    setColors({
      S: colS || "#0284c7",
      I: colI || "#16a34a",
    });
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {/* IMPORTANT: ChartContainer must have exactly one child */}
      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="machineId"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[minVal, maxVal + yPadding]}
              tickLine={false}
              axisLine={false}
              width={44}
              tickMargin={4}
            />
            {/* Shaded underperformance band: 0..threshold; use string, not boolean for stroke */}
            <ReferenceArea
              y1={thresholdHours}
              y2={minVal}
              fill="rgba(220,38,38,0.12)" // red-600 @ 12%
              stroke="none"
            />
            {/* Threshold line */}
            <ReferenceLine
              y={thresholdHours}
              stroke="rgba(220,38,38,0.6)"
              strokeDasharray="4 4"
              label={{
                value: `Threshold: ${thresholdHours} h`,
                position: "right",
                fill: "rgba(220,38,38,0.9)",
                fontSize: 12,
              }}
            />
            {/* Fleet average */}
            {values.length > 0 && (
              <ReferenceLine
                y={avg}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{
                  value: `Avg: ${avg} h`,
                  position: "right",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 12,
                }}
              />
            )}
            <Tooltip
              contentStyle={{
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--background))",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value: any, name: string) => {
                if (value == null) return ["—", name];
                return [`${value} h`, name === "S" ? "Project S" : "Project I"];
              }}
              labelFormatter={(label: any) => `Machine ${label}`}
            />

            {/* Lines by project (now using concrete colors) */}
            <Line
              type="monotone"
              dataKey="S"
              name="Project S"
              stroke={colors.S}
              strokeWidth={2}
              dot={{ r: 3, stroke: colors.S, fill: "#fff" }}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
              hide={!showS}
            />
            <Line
              type="monotone"
              dataKey="I"
              name="Project I"
              stroke={colors.I}
              strokeWidth={2}
              dot={{ r: 3, stroke: colors.I, fill: "#fff" }}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
              hide={!showI}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
