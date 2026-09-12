"use client";

import { useId, useMemo, useState } from "react";
import { Card, CardHeader, Segmented, Stat } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

function toDisplay(lbs: number, unit: "lbs" | "kg") {
  return unit === "kg" ? Math.round((lbs / 2.20462) * 10) / 10 : lbs;
}

type Point = { date: string; top: number; volume: number };

export function GymProgressCharts() {
  const gradientId = useId();
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
    <Card className="overflow-hidden">
      <CardHeader title="Progress" meta={selected?.name} />
      <div className="p-4">
        <Segmented
          size="sm"
          label="Exercise"
          value={selected?.id ?? ""}
          onChange={setSelectedId}
          className="mb-4"
          options={chartable.map((ex) => ({ value: ex.id, label: ex.name }))}
        />

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat label="Latest top set" value={`${toDisplay(last?.top ?? 0, gymWeightUnit)} ${gymWeightUnit}`} />
          <Stat label="All-time best" value={`${toDisplay(best, gymWeightUnit)} ${gymWeightUnit}`} />
          <Stat
            label="Since first"
            value={
              <span className={cn(delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-ink")}>
                {delta > 0 ? "+" : ""}{toDisplay(delta, gymWeightUnit)} {gymWeightUnit}
              </span>
            }
          />
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "rgb(var(--color-accent))", stopOpacity: 0.18 }} />
              <stop offset="100%" style={{ stopColor: "rgb(var(--color-accent))", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={toY(v)} y2={toY(v)} className="stroke-line" strokeWidth="1" strokeDasharray="3 5" />
              <text x={PAD_L - 8} y={toY(v) + 3} fontSize="10" className="fill-subtle" textAnchor="end">
                {toDisplay(Math.round(v), gymWeightUnit)}
              </text>
            </g>
          ))}
          {points.length > 1 && (
            <path
              d={`${pathD} L ${toX(points.length - 1).toFixed(1)} ${H - PAD_B} L ${PAD_L} ${H - PAD_B} Z`}
              fill={`url(#${gradientId})`}
            />
          )}
          <path d={pathD} fill="none" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={p.date + i}>
              <circle cx={toX(i)} cy={toY(p.top)} r="3.5" className="fill-panel stroke-accent" strokeWidth="2" />
              <title>{`${fmtDate(p.date)} — top set ${toDisplay(p.top, gymWeightUnit)} ${gymWeightUnit}, volume ${toDisplay(p.volume, gymWeightUnit)}`}</title>
            </g>
          ))}
          {labelIdxs.map((i) => (
            <text key={i} x={toX(i)} y={H - 8} fontSize="10" className="fill-subtle" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
              {fmtDate(points[i].date)}
            </text>
          ))}
        </svg>
      </div>
    </Card>
  );
}
