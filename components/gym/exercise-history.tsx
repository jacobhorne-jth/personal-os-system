"use client";

import { useId, useMemo } from "react";
import { X } from "lucide-react";
import type { GymExercise, GymSession } from "@/lib/types/domain";

function SparkLine({ points, unitLabel }: { points: { date: string; weight: number }[]; unitLabel: (lbs: number) => string }) {
  const gradientId = useId();
  if (points.length < 2) return null;
  const W = 280;
  const H = 80;
  const pad = 8;
  const weights = points.map((p) => p.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const toX = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const toY = (w: number) => H - pad - 10 - ((w - minW) / range) * (H - pad * 2 - 10);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.weight).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "rgb(var(--color-accent))", stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: "rgb(var(--color-accent))", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${toX(points.length - 1).toFixed(1)} ${H - 10} L ${pad} ${H - 10} Z`} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.weight)} r="2.5" className="fill-accent" />
      ))}
      <text x={pad} y={H - 1} fontSize="9" className="fill-subtle">{unitLabel(minW)}</text>
      <text x={W - pad} y={H - 1} fontSize="9" className="fill-subtle" textAnchor="end">{unitLabel(maxW)}</text>
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{exercise.name}</h2>
          <p className="text-xs capitalize text-muted">
            {[exercise.muscleGroup, `last ${display(exercise.lastWeight)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          onClick={onClose}
          title="Close exercise history"
          aria-label="Close exercise history"
          className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      {history.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted">No sessions logged for this exercise yet.</p>
      ) : (
        <>
          {sparkPoints.length >= 2 && (
            <div className="rounded-lg bg-paper p-3">
              <p className="mb-2 text-xs text-muted">Top set over time</p>
              <SparkLine points={sparkPoints} unitLabel={display} />
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[1fr_72px_44px_44px] border-b border-line px-3 py-2 text-[11px] font-medium text-subtle">
              <span>Date</span>
              <span className="text-right">Top set</span>
              <span className="text-right">Sets</span>
              <span className="text-right">Reps</span>
            </div>
            <div className="divide-y divide-line">
              {[...history].reverse().map((h) => (
                <div key={h.date} className="grid grid-cols-[1fr_72px_44px_44px] px-3 py-2 text-[13px] tabular-nums">
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
