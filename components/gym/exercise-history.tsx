"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { GymExercise, GymSession } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function SparkLine({ points }: { points: { date: string; weight: number }[] }) {
  if (points.length < 2) return null;
  const W = 280;
  const H = 80;
  const pad = 8;
  const weights = points.map((p) => p.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const toX = (_: unknown, i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const toY = (w: number) => H - pad - ((w - minW) / range) * (H - pad * 2);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(null, i).toFixed(1)} ${toY(p.weight).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${toX(null, points.length - 1).toFixed(1)} ${H} L ${pad} ${H} Z`}
        fill="url(#spark-grad)"
      />
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={toX(null, i)} cy={toY(p.weight)} r="3" fill="#3b82f6" />
      ))}
      {/* min / max labels */}
      <text x={pad} y={H - 1} fontSize="9" fill="#6b7280">{minW} lbs</text>
      <text x={W - pad} y={H - 1} fontSize="9" fill="#6b7280" textAnchor="end">{maxW} lbs</text>
    </svg>
  );
}

export function ExerciseHistory({
  exercise,
  sessions,
  unit,
  onClose,
}: {
  exercise: GymExercise;
  sessions: GymSession[];
  unit: "lbs" | "kg";
  onClose: () => void;
}) {
  const toLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
  const display = (lbs: number) =>
    unit === "kg" ? `${(lbs / 2.20462).toFixed(1)} kg` : `${lbs} lbs`;

  const history = useMemo(() => {
    const entries: { date: string; maxWeight: number; totalSets: number; totalReps: number }[] = [];
    for (const session of sessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exercise.id);
      if (!ex) continue;
      const doneSets = ex.sets.filter((s) => s.done && s.weight > 0);
      if (doneSets.length === 0) continue;
      const maxWeight = Math.max(...doneSets.map((s) => s.weight));
      const totalSets = doneSets.length;
      const totalReps = doneSets.reduce((sum, s) => sum + s.reps, 0);
      entries.push({ date: session.date, maxWeight, totalSets, totalReps });
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [exercise.id, sessions]);

  const sparkPoints = history.map((h) => ({ date: h.date, weight: h.maxWeight }));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{exercise.name}</h2>
          <p className="text-xs text-muted capitalize">{exercise.muscleGroup} · last weight: {display(exercise.lastWeight)}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-muted hover:bg-line hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      {history.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No logged sessions yet for this exercise.</p>
      ) : (
        <>
          {/* Chart */}
          {sparkPoints.length >= 2 && (
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="mb-2 text-[11px] font-medium text-muted uppercase tracking-wide">Weight over time</p>
              <SparkLine points={sparkPoints} />
            </div>
          )}

          {/* Session list */}
          <div className="rounded-lg border border-line overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_80px] bg-line px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted">
              <span>Date</span>
              <span className="text-right">Max wt</span>
              <span className="text-right">Sets</span>
              <span className="text-right">Reps</span>
            </div>
            <div className="divide-y divide-line">
              {[...history].reverse().map((h) => (
                <div key={h.date} className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-2 text-sm">
                  <span className="text-muted">{new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span className="text-right font-medium text-ink">{display(h.maxWeight)}</span>
                  <span className="text-right text-muted">{h.totalSets}</span>
                  <span className="text-right text-muted">{h.totalReps}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
