"use client";

import * as React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

type Point = {
  machineId: string;
  project: "S" | "I";
  mtbfHours: number;
};

const data: Point[] = [
  { machineId: "S-101", project: "S", mtbfHours: 260 },
  { machineId: "S-102", project: "S", mtbfHours: 95 },
  { machineId: "S-103", project: "S", mtbfHours: 280 },
  { machineId: "S-104", project: "S", mtbfHours: 140 },
  { machineId: "I-201", project: "I", mtbfHours: 240 },
  { machineId: "I-202", project: "I", mtbfHours: 110 },
  { machineId: "I-203", project: "I", mtbfHours: 220 },
];

const chartConfig = {
  S: { label: "Project S", color: "hsl(var(--chart-1))" },
  I: { label: "Project I", color: "hsl(var(--chart-2))" },
  mtbfHours: { label: "MTBF (hours)" },
} satisfies ChartConfig;

// Fallbacks if CSS vars aren't available
const COLOR_S = "var(--color-S, #0284c7)";
const COLOR_I = "var(--color-I, #16a34a)";

export default function MtbfChartECharts() {
  const avg =
    Math.round(
      (data.reduce((s, d) => s + d.mtbfHours, 0) / data.length) * 10
    ) / 10;

  const option = {
    grid: { left: 56, right: 16, top: 24, bottom: 40 },
    xAxis: {
      type: "category",
      data: data.map((d) => d.machineId),
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "Hours",
      nameTextStyle: { padding: [0, 0, 0, 8] },
      splitLine: { lineStyle: { type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        // Defensive guard for both array/object cases
        const p = Array.isArray(params) ? params[0] : params;
        if (!p || p.dataIndex == null) return "";
        const d = data[p.dataIndex];
        if (!d) return "";
        return `
          <div>
            <div><strong>${d.machineId}</strong></div>
            <div>Project: ${d.project}</div>
            <div>MTBF: ${d.mtbfHours} h</div>
          </div>
        `;
      },
    },
    series: [
      {
        name: "MTBF (h)",
        type: "bar",
        barWidth: 28,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: data.map((d) => ({
          value: d.mtbfHours,
          itemStyle: { color: d.project === "S" ? COLOR_S : COLOR_I },
        })),
        markLine: {
          symbol: "none",
          lineStyle: { type: "dashed", color: "hsl(var(--muted-foreground))" },
          label: {
            formatter: `Avg: ${avg} h`,
            position: "end",
            color: "hsl(var(--muted-foreground))",
          },
          data: [{ yAxis: avg }],
        },
      },
    ],
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>MTBF by Machine</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mean Time Between Failures (hours), color-coded by project.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {/* ChartContainer provides theme color vars; fallbacks ensure safety */}
        <ChartContainer
          config={chartConfig}
          className="h-[320px] w-full"
        >
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
        </ChartContainer>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4">
          <LegendSwatch colorVar="--color-S" fallback="#0284c7" label="Project S" />
          <LegendSwatch colorVar="--color-I" fallback="#16a34a" label="Project I" />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendSwatch({
  colorVar,
  fallback,
  label,
}: {
  colorVar: string;
  fallback: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-3 rounded-sm"
        style={{ background: `var(${colorVar}, ${fallback})` }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
