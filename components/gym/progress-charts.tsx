"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

function toDisplay(lbs: number, unit: "lbs" | "kg") {
  return unit === "kg" ? Math.round((lbs / 2.20462) * 10) / 10 : lbs;
}

type Point = { date: string; top: number; volume: number };

export function GymProgressCharts() {
  const gymExercises = useAppStore((s) => s.gymExercises);
  const gymSessions = useAppStore((s) => s.gymSessions);
  const gymWeightUnit = useAppStore((s) => s.gymWeightUnit);

  // Exercises that appear in at least two sessions with completed sets —
  // anything less has no progression to chart
  const chartable = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of gymSessions) {
      for (const se of session.exercises) {
        if (se.sets.some((set) => set.done && set.weight > 0)) {
          counts.set(se.exerciseId, (counts.get(se.exerciseId) ?? 0) + 1);
        }
      }
    }
    return gymExercises.filter((e) => (counts.get(e.id) ?? 0) >= 2);
  }, [gymExercises, gymSessions]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = chartable.find((e) => e.id === selectedId) ?? chartable[0];

  const points: Point[] = useMemo(() => {
    if (!selected) return [];
    return gymSessions
      .map((session) => {
        const se = session.exercises.find((x) => x.exerciseId === selected.id);
        const done = se?.sets.filter((set) => set.done && set.weight > 0) ?? [];
        if (done.length === 0) return null;
        return {
          date: session.date,
          top: Math.max(...done.map((set) => set.weight)),
          volume: done.reduce((sum, set) => sum + set.weight * set.reps, 0),
        };
      })
      .filter((p): p is Point => p !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [gymSessions, selected]);

  if (chartable.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const best = Math.max(...points.map((p) => p.top));
  const delta = last && first ? last.top - first.top : 0;

  // ── Chart geometry ──────────────────────────────────────────────────────────
  const W = 640;
  const H = 220;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;
  const tops = points.map((p) => p.top);
  const minW = Math.min(...tops);
  const maxW = Math.max(...tops);
  const range = maxW - minW || 1;
  const yMin = minW - range * 0.15;
  const yMax = maxW + range * 0.15;

  const toX = (i: number) => PAD_L + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - PAD_L - PAD_R);
  const toY = (w: number) => PAD_T + (1 - (w - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.top).toFixed(1)}`).join(" ");

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines }, (_, i) => yMin + ((i + 0.5) / gridLines) * (yMax - yMin));

  // Date labels: first, middle, last
  const labelIdxs = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  function fmtDate(dateStr: string) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="rounded-xl border border-line bg-panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-line/40 px-5 py-3">
        <TrendingUp className="size-4 text-muted" />
        <p className="text-sm font-medium text-ink">Progress</p>
      </div>
      <div className="p-4">
        {/* Exercise selector chips */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {chartable.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedId(ex.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition",
                selected?.id === ex.id
                  ? "bg-blue/20 text-blue"
                  : "border border-line text-muted hover:text-ink"
              )}
            >
              {ex.name}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line bg-paper p-2">
            <p className="text-lg font-semibold text-ink">{toDisplay(last?.top ?? 0, gymWeightUnit)} {gymWeightUnit}</p>
            <p className="text-[11px] text-muted">latest top set</p>
          </div>
          <div className="rounded-lg border border-line bg-paper p-2">
            <p className="text-lg font-semibold text-ink">{toDisplay(best, gymWeightUnit)} {gymWeightUnit}</p>
            <p className="text-[11px] text-muted">all-time best</p>
          </div>
          <div className="rounded-lg border border-line bg-paper p-2">
            <p className={cn("text-lg font-semibold", delta > 0 ? "text-mint" : delta < 0 ? "text-red-400" : "text-ink")}>
              {delta > 0 ? "+" : ""}{toDisplay(delta, gymWeightUnit)} {gymWeightUnit}
            </p>
            <p className="text-[11px] text-muted">since first session</p>
          </div>
        </div>

        {/* Chart */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id="prog-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={toY(v)} y2={toY(v)} stroke="#3c4043" strokeWidth="1" strokeDasharray="3 5" />
              <text x={PAD_L - 6} y={toY(v) + 3} fontSize="10" fill="#9aa0a6" textAnchor="end">
                {toDisplay(Math.round(v), gymWeightUnit)}
              </text>
            </g>
          ))}
          {points.length > 1 && (
            <path
              d={`${pathD} L ${toX(points.length - 1).toFixed(1)} ${H - PAD_B} L ${PAD_L} ${H - PAD_B} Z`}
              fill="url(#prog-grad)"
            />
          )}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={p.date + i}>
              <circle cx={toX(i)} cy={toY(p.top)} r="4" fill="#1f1f1f" stroke="#3b82f6" strokeWidth="2.5" />
              <title>{`${fmtDate(p.date)} — top set ${toDisplay(p.top, gymWeightUnit)} ${gymWeightUnit}, volume ${toDisplay(p.volume, gymWeightUnit)}`}</title>
            </g>
          ))}
          {labelIdxs.map((i) => (
            <text key={i} x={toX(i)} y={H - 8} fontSize="10" fill="#9aa0a6" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
              {fmtDate(points[i].date)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
