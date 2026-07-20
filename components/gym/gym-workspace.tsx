"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Dumbbell, History, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { ExerciseHistory } from "@/components/gym/exercise-history";
import { GymProgressCharts } from "@/components/gym/progress-charts";
import { SplitEditor } from "@/components/gym/split-editor";
import type { GymExercise } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/dates";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayDayIndex(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;   // convert to 0=Mon
}

function todayStr() {
  return localDateKey();
}

// ─── Weight unit helpers ──────────────────────────────────────────────────────

function lbsToKg(lbs: number) { return Math.round((lbs / 2.20462) * 10) / 10; }
function kgToLbs(kg: number) { return Math.round(kg * 2.20462 * 10) / 10; }
function displayWeight(lbs: number, unit: "lbs" | "kg") {
  return unit === "kg" ? lbsToKg(lbs) : lbs;
}
function parseToLbs(value: number, unit: "lbs" | "kg") {
  return unit === "kg" ? kgToLbs(value) : value;
}

// ─── Weight input ─────────────────────────────────────────────────────────────

function WeightInput({
  lbs,
  unit,
  onChange,
  className,
}: {
  lbs: number;
  unit: "lbs" | "kg";
  onChange: (newLbs: number) => void;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(displayWeight(lbs, unit)));
  const prevUnit = useRef(unit);

  useEffect(() => {
    if (prevUnit.current !== unit) {
      setRaw(String(displayWeight(lbs, unit)));
      prevUnit.current = unit;
    }
  }, [unit, lbs]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        type="number"
        min={0}
        step={unit === "kg" ? 0.5 : 5}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseFloat(e.target.value);
          if (!isNaN(n) && n >= 0) onChange(parseToLbs(n, unit));
        }}
        onBlur={() => setRaw(String(displayWeight(lbs, unit)))}
        className="w-16 rounded border border-line bg-paper px-1.5 py-1 text-center text-sm text-ink outline-none focus:border-blue"
      />
      <span className="text-xs text-muted">{unit}</span>
    </div>
  );
}

// ─── Active session exercise row ──────────────────────────────────────────────

function ActiveExerciseRow({
  exerciseIdx,
  exercise,
  sets,
  unit,
  onOpenHistory,
}: {
  exerciseIdx: number;
  exercise: GymExercise;
  sets: { weight: number; reps: number; done: boolean }[];
  unit: "lbs" | "kg";
  onOpenHistory: () => void;
}) {
  const updateActiveSet = useAppStore((s) => s.updateActiveSet);
  const addSetToActive = useAppStore((s) => s.addSetToActive);
  const removeSetFromActive = useAppStore((s) => s.removeSetFromActive);

  const [collapsed, setCollapsed] = useState(false);
  const doneCount = sets.filter((s) => s.done).length;
  const allDone = doneCount === sets.length;

  // When a weight changes, propagate down to all unchecked sets below
  function handleWeightChange(setIdx: number, newLbs: number) {
    updateActiveSet(exerciseIdx, setIdx, { weight: newLbs });
    for (let i = setIdx + 1; i < sets.length; i++) {
      if (!sets[i].done) {
        updateActiveSet(exerciseIdx, i, { weight: newLbs });
      }
    }
  }

  return (
    <div className={cn("rounded-lg border transition", allDone ? "border-mint/40 bg-mint/5" : "border-line bg-paper")}>
      {/* Exercise header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCollapsed((c) => !c); }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3"
      >
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
          allDone ? "bg-mint text-white" : "border border-line text-muted")}>
          {allDone ? <Check className="size-3" /> : doneCount}
        </span>
        <span className="flex-1 text-left text-sm font-medium text-ink">{exercise.name}</span>
        <span className="text-xs text-muted">{doneCount}/{sets.length} sets</span>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenHistory(); }}
          className="rounded p-1 text-muted hover:bg-line hover:text-ink"
        >
          <History className="size-3.5" />
        </button>
        {collapsed ? <ChevronRight className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
      </div>

      {/* Set rows */}
      {!collapsed && (
        <div className="border-t border-line px-4 pb-3 pt-2 space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_80px_48px_32px] items-center gap-2 px-0.5 text-[10px] uppercase tracking-wide text-muted">
            <span>Set</span>
            <span>Weight</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Done</span>
            <span />
          </div>

          {sets.map((s, si) => (
            <div key={si} className={cn("grid grid-cols-[32px_1fr_80px_48px_32px] items-center gap-2 rounded-lg px-0.5 py-0.5 transition", s.done && "opacity-60")}>
              <span className="text-xs font-medium text-muted">{si + 1}</span>
              <WeightInput
                lbs={s.weight}
                unit={unit}
                onChange={(newLbs) => handleWeightChange(si, newLbs)}
              />
              <input
                type="number"
                min={1}
                value={s.reps}
                onChange={(e) => updateActiveSet(exerciseIdx, si, { reps: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full rounded border border-line bg-paper px-1.5 py-1 text-center text-sm text-ink outline-none focus:border-blue"
              />
              <button
                onClick={() => updateActiveSet(exerciseIdx, si, { done: !s.done })}
                className={cn(
                  "mx-auto flex size-7 items-center justify-center rounded-full border-2 transition",
                  s.done
                    ? "border-mint bg-mint text-white"
                    : "border-line text-transparent hover:border-mint/50"
                )}
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => removeSetFromActive(exerciseIdx, si)}
                className="rounded p-1 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => addSetToActive(exerciseIdx)}
            className="mt-1 flex items-center gap-1.5 text-xs text-muted hover:text-blue transition"
          >
            <Plus className="size-3.5" /> Add set
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Preview (no active session) ─────────────────────────────────────────────

function DayPreview({
  dayIndex,
  onStart,
  onOpenHistory,
}: {
  dayIndex: number;
  onStart: () => void;
  onOpenHistory: (ex: GymExercise) => void;
}) {
  const gymExercises = useAppStore((s) => s.gymExercises);
  const gymDays = useAppStore((s) => s.gymDays);
  const gymSessions = useAppStore((s) => s.gymSessions);
  const gymWeightUnit = useAppStore((s) => s.gymWeightUnit);

  const day = gymDays.find((d) => d.dayIndex === dayIndex);
  const exercises = (day?.exerciseIds ?? [])
    .map((eid) => gymExercises.find((e) => e.id === eid))
    .filter(Boolean) as GymExercise[];

  const lastSession = gymSessions.find((s) => s.dayLabel === day?.label);
  const lastSessionDate = lastSession
    ? new Date(lastSession.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div className="space-y-3">
      {lastSessionDate && (
        <p className="text-xs text-muted">Last {day?.label} session: {lastSessionDate}</p>
      )}

      <div className="rounded-lg border border-line overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px] bg-line px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted">
          <span>Exercise</span>
          <span className="text-center">Sets×Reps</span>
          <span className="text-right">Last wt</span>
        </div>
        <div className="divide-y divide-line">
          {exercises.map((ex) => (
            <div key={ex.id} className="grid grid-cols-[1fr_80px_80px] items-center px-4 py-2.5">
              <button
                onClick={() => onOpenHistory(ex)}
                className="text-left text-sm text-ink hover:text-blue transition"
              >
                {ex.name}
              </button>
              <span className="text-center text-xs text-muted">{ex.defaultSets}×{ex.defaultReps}</span>
              <span className="text-right text-xs text-ink">
                {ex.lastWeight === 0
                  ? "—"
                  : `${displayWeight(ex.lastWeight, gymWeightUnit)} ${gymWeightUnit}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full rounded-lg bg-blue py-3 text-sm font-medium text-white hover:bg-blue/90 transition"
      >
        Start workout
      </button>
    </div>
  );
}

// ─── Main workspace ───────────────────────────────────────────────────────────

export function GymWorkspace() {
  const gymExercises = useAppStore((s) => s.gymExercises);
  const gymDays = useAppStore((s) => s.gymDays);
  const gymSessions = useAppStore((s) => s.gymSessions);
  const activeGymSession = useAppStore((s) => s.activeGymSession);
  const gymWeightUnit = useAppStore((s) => s.gymWeightUnit);
  const initGymIfEmpty = useAppStore((s) => s.initGymIfEmpty);
  const startGymSession = useAppStore((s) => s.startGymSession);
  const finishGymSession = useAppStore((s) => s.finishGymSession);
  const cancelGymSession = useAppStore((s) => s.cancelGymSession);
  const setGymWeightUnit = useAppStore((s) => s.setGymWeightUnit);
  const addExerciseToActive = useAppStore((s) => s.addExerciseToActive);

  const [selectedDay, setSelectedDay] = useState(todayDayIndex());
  const [panel, setPanel] = useState<"none" | "split" | "history">("none");
  const [historyExercise, setHistoryExercise] = useState<GymExercise | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);

  useEffect(() => { initGymIfEmpty(); }, [initGymIfEmpty]);

  // If there's an active session, snap to that day
  useEffect(() => {
    if (activeGymSession) {
      const d = gymDays.find((day) => day.label === activeGymSession.dayLabel);
      if (d !== undefined) setSelectedDay(d.dayIndex);
    }
  }, [activeGymSession, gymDays]);

  const today = todayDayIndex();
  const currentDay = gymDays.find((d) => d.dayIndex === selectedDay);
  const sessionExercises = useMemo(() =>
    activeGymSession?.exercises.map((se, idx) => ({
      idx,
      exercise: gymExercises.find((e) => e.id === se.exerciseId),
      sets: se.sets,
    })).filter((x) => x.exercise) ?? [],
    [activeGymSession, gymExercises]
  );

  const catalogSearchResults = gymExercises.filter(
    (e) =>
      e.name.toLowerCase().includes(addQuery.toLowerCase()) &&
      !activeGymSession?.exercises.some((se) => se.exerciseId === e.id)
  ).slice(0, 6);

  const isActive = !!activeGymSession;
  const activeOnSelectedDay = isActive && gymDays.find((d) => d.label === activeGymSession?.dayLabel)?.dayIndex === selectedDay;

  const totalDone = sessionExercises.reduce((sum, se) => sum + se.sets.filter((s) => s.done).length, 0);
  const totalSets = sessionExercises.reduce((sum, se) => sum + se.sets.length, 0);

  function openHistory(ex: GymExercise) {
    setHistoryExercise(ex);
    setPanel("history");
  }

  const elapsed = useMemo(() => {
    if (!activeGymSession) return "";
    const ms = Date.now() - new Date(activeGymSession.startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }, [activeGymSession]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Gym</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            {isActive ? `${activeGymSession.dayLabel} · In progress` : currentDay?.label ? `${currentDay.label} Day` : "Workout"}
          </h1>
          {isActive && (
            <p className="mt-1 text-xs text-muted">{totalDone}/{totalSets} sets done · {elapsed}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line overflow-hidden text-xs font-medium">
            {(["lbs", "kg"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setGymWeightUnit(u)}
                className={cn("px-3 py-1.5 transition", gymWeightUnit === u ? "bg-blue text-white" : "bg-paper text-muted hover:text-ink")}
              >
                {u}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPanel((p) => p === "split" ? "none" : "split")}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink hover:bg-panel transition"
          >
            <Settings className="size-4" />
            Edit split
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* Day tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {gymDays.map((d) => {
              const isToday = d.dayIndex === today;
              const isSelected = d.dayIndex === selectedDay;
              const hasActive = isActive && gymDays.find((day) => day.label === activeGymSession?.dayLabel)?.dayIndex === d.dayIndex;
              return (
                <button
                  key={d.dayIndex}
                  onClick={() => setSelectedDay(d.dayIndex)}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs transition",
                    isSelected
                      ? "border-blue bg-blue/10 text-blue"
                      : "border-line bg-paper text-muted hover:text-ink"
                  )}
                >
                  <span className={cn("font-medium", isToday && !isSelected && "text-blue")}>{DAY_LABELS[d.dayIndex]}</span>
                  <span className="text-[10px] opacity-80">{d.label}</span>
                  {hasActive && <span className="size-1.5 rounded-full bg-mint" />}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          {isActive && activeOnSelectedDay ? (
            <div className="space-y-3">
              {/* Active session exercises */}
              {sessionExercises.map(({ idx, exercise, sets }) => exercise && (
                <ActiveExerciseRow
                  key={exercise.id}
                  exerciseIdx={idx}
                  exercise={exercise}
                  sets={sets}
                  unit={gymWeightUnit}
                  onOpenHistory={() => openHistory(exercise)}
                />
              ))}

              {/* Add exercise to session */}
              {showAddExercise ? (
                <div className="rounded-lg border border-blue/40 bg-panel p-3 space-y-2">
                  <input
                    autoFocus
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowAddExercise(false); setAddQuery(""); } }}
                    placeholder="Search exercises…"
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                  {addQuery.trim() && (
                    <div className="rounded-lg border border-line bg-paper overflow-hidden">
                      {catalogSearchResults.map((ex) => (
                        <button
                          key={ex.id}
                          onMouseDown={() => { addExerciseToActive(ex.id); setAddQuery(""); setShowAddExercise(false); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-line"
                        >
                          <span>{ex.name}</span>
                          <span className="ml-auto text-[11px] text-muted">{displayWeight(ex.lastWeight, gymWeightUnit)} {gymWeightUnit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setShowAddExercise(false); setAddQuery(""); }} className="text-xs text-muted hover:text-ink">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddExercise(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted hover:border-blue/50 hover:text-blue transition"
                >
                  <Plus className="size-4" /> Add exercise
                </button>
              )}

              {/* Finish / cancel */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setFinishConfirm(true)}
                  className="flex-1 rounded-lg bg-mint py-3 text-sm font-medium text-white hover:bg-mint/90 transition"
                >
                  Finish workout
                </button>
                <button
                  onClick={cancelGymSession}
                  className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted hover:text-ink transition"
                >
                  Cancel
                </button>
              </div>

              {finishConfirm && (
                <div className="rounded-lg border border-mint/40 bg-mint/10 p-4 text-center space-y-3">
                  <p className="text-sm text-ink">{totalDone} of {totalSets} sets completed. Save this session?</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { finishGymSession(); setFinishConfirm(false); }} className="rounded-lg bg-mint px-4 py-2 text-xs font-medium text-white">
                      Save workout
                    </button>
                    <button onClick={() => setFinishConfirm(false)} className="rounded-lg border border-line bg-paper px-4 py-2 text-xs text-muted">
                      Keep going
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isActive && !activeOnSelectedDay ? (
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4 text-center">
              <p className="text-sm text-ink">You have an active <strong>{activeGymSession?.dayLabel}</strong> session in progress.</p>
              <button
                onClick={() => {
                  const d = gymDays.find((day) => day.label === activeGymSession?.dayLabel);
                  if (d) setSelectedDay(d.dayIndex);
                }}
                className="mt-2 text-sm text-blue hover:underline"
              >
                Go to active session →
              </button>
            </div>
          ) : (
            <DayPreview
              dayIndex={selectedDay}
              onStart={() => startGymSession(selectedDay)}
              onOpenHistory={openHistory}
            />
          )}
        </div>

        {/* Right panel — split editor or history */}
        {panel !== "none" && (
          <aside className="rounded-xl border border-line bg-panel p-4">
            {panel === "split" && (
              <SplitEditor onClose={() => setPanel("none")} />
            )}
            {panel === "history" && historyExercise && (
              <ExerciseHistory
                exercise={historyExercise}
                sessions={gymSessions}
                unit={gymWeightUnit}
                onClose={() => { setPanel("none"); setHistoryExercise(null); }}
              />
            )}
          </aside>
        )}
      </div>

      {/* Recent sessions */}
      {gymSessions.length > 0 && (
        <div className="rounded-xl border border-line bg-panel overflow-hidden">
          <div className="border-b border-line bg-line px-4 py-3 flex items-center gap-2">
            <History className="size-4 text-muted" />
            <p className="text-sm font-medium text-ink">Recent sessions</p>
          </div>
          <div className="divide-y divide-line">
            {gymSessions.slice(0, 5).map((session) => {
              const totalSetsLog = session.exercises.reduce((s, e) => s + e.sets.filter((set) => set.done).length, 0);
              const dur = Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000);
              return (
                <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-line text-xs font-semibold text-blue">
                    {session.dayLabel.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{session.dayLabel} Day</p>
                    <p className="text-xs text-muted">
                      {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}{session.exercises.length} exercises · {totalSetsLog} sets
                    </p>
                  </div>
                  <span className="text-xs text-muted">{dur}m</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <GymProgressCharts />
    </div>
  );
}
