"use client";

import * as React from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
// import type { Machine } from "@/components/DataTable";
import type { MachineT } from "@/domain/machine";

type Props = {
  /** Visible machines after table filter + project chips */
  machines: MachineT[];
  metric: "mtbf" | "mttr";
  width?: number;  // kept for API compatibility (ResponsiveContainer handles actual sizing)
  height?: number; // kept for API compatibility
};

const SPARKLINE_GRAY = "#64748b"; // slate-500

function fmt(n: unknown) {
  if (n == null || !isFinite(Number(n))) return "—";
  const val = Math.round(Number(n) * 100) / 100;
  return Number.isInteger(val) ? String(Math.round(val)) : val.toFixed(2);
}

function FleetSparklineBase({ machines, metric }: Props) {
  // Build 4-week fleet averages across visible machines
  const weekly = React.useMemo(() => {
    const weeks = 4;
    const arr: { wk: string; value: number }[] = [];
    for (let i = 0; i < weeks; i++) {
      const vals: number[] = [];
      for (const m of machines) {
        const t = metric === "mtbf" ? m.mtbfTrend : m.mttrTrend;
        if (!t || t[i] == null) continue;
        if (t && t[i] != null) vals.push(t[i]!);
      }
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      arr.push({ wk: String(i + 1), value: Math.round(avg * 100) / 100 });
    }
    return arr;
  }, [machines, metric]);

  const values = weekly.map((d) => d.value);
  const hasData = values.length > 0 && values.every((v) => Number.isFinite(v));
  const minVal = hasData ? Math.min(...values) : 0;
  const maxVal = hasData ? Math.max(...values) : 1;

  // Pad domain so flat trends still show motion
  let lo = minVal;
  let hi = maxVal;
  if (hi === lo) {
    const pad = Math.max(0.5, Math.abs(hi) * 0.05);
    lo = lo - pad;
    hi = hi + pad;
  } else {
    const pad = Math.max(0.1, (hi - lo) * 0.1);
    lo = lo - pad;
    hi = hi + pad;
  }

  // Re-trigger animation when weekly values change
  const animationKey = React.useMemo(() => weekly.map((d) => d.value).join("\n"), [weekly]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const metricLabel = metric.toUpperCase();
  const ariaLabel = `Fleet ${metricLabel} average for the past 4 weeks`;

  return (
    <div className="w-full h-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weekly} margin={{ top: 2, right: 8, bottom: 0, left: 8 }}>
          {/* hidden axes (sparkline) */}
          <XAxis dataKey="wk" hide />
          <YAxis domain={[lo, hi]} hide />
          <Tooltip
            formatter={(v: unknown) => [`${fmt(v)} h`, metricLabel]}
            labelFormatter={(l) => `Week -${5 - Number(l)}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={SPARKLINE_GRAY}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={mounted}
            animationDuration={280}
            animationBegin={0}
            key={animationKey}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default React.memo(FleetSparklineBase);