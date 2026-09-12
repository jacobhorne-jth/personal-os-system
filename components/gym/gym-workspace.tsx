"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Dumbbell, History, Plus, Settings2, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { ExerciseHistory } from "@/components/gym/exercise-history";
import { GymProgressCharts } from "@/components/gym/progress-charts";
import { SplitEditor } from "@/components/gym/split-editor";
import { Button, Card, CardHeader, EmptyState, Page, PageHeader, Segmented, iconButtonClass, inputClass } from "@/components/ui/primitives";
import type { GymExercise } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayDayIndex(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;   // convert to 0=Mon
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

const numberInput =
  "h-8 w-full rounded-md border border-line bg-panel px-1.5 text-center text-sm tabular-nums text-ink outline-none transition focus:border-ink/25";

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
    <div className={cn("flex items-center gap-1.5", className)}>
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
        aria-label="Weight"
        className={cn(numberInput, "w-16")}
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
    <Card className={cn("overflow-hidden transition-colors", allDone && "border-success/30")}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCollapsed((c) => !c); }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3"
      >
        <span className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums",
          allDone ? "bg-success text-white" : "bg-hover text-muted"
        )}>
          {allDone ? <Check className="size-3.5" strokeWidth={3} /> : doneCount}
        </span>
        <span className="flex-1 text-left text-sm font-medium text-ink">{exercise.name}</span>
        <span className="text-xs tabular-nums text-muted">{doneCount}/{sets.length} sets</span>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenHistory(); }}
          title={`Open ${exercise.name} history`}
          aria-label={`Open ${exercise.name} history`}
          className={iconButtonClass("size-7")}
        >
          <History className="size-3.5" />
        </button>
        <ChevronDown className={cn("size-4 text-subtle transition-transform", collapsed && "-rotate-90")} />
      </div>

      {!collapsed && (
        <div className="border-t border-line px-4 pb-3 pt-2">
          <div className="grid grid-cols-[28px_1fr_72px_40px_28px] items-center gap-2 pb-1 text-[11px] font-medium text-subtle">
            <span>Set</span>
            <span>Weight</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Done</span>
            <span />
          </div>

          <div className="space-y-1.5">
            {sets.map((s, si) => (
              <div key={si} className={cn("group grid grid-cols-[28px_1fr_72px_40px_28px] items-center gap-2 transition-opacity", s.done && "opacity-55")}>
                <span className="text-xs font-medium tabular-nums text-muted">{si + 1}</span>
                <WeightInput lbs={s.weight} unit={unit} onChange={(newLbs) => handleWeightChange(si, newLbs)} />
                <input
                  type="number"
                  min={1}
                  value={s.reps}
                  onChange={(e) => updateActiveSet(exerciseIdx, si, { reps: Math.max(1, parseInt(e.target.value) || 1) })}
                  aria-label="Reps"
                  className={numberInput}
                />
                <button
                  onClick={() => updateActiveSet(exerciseIdx, si, { done: !s.done })}
                  aria-label={s.done ? `Undo set ${si + 1}` : `Complete set ${si + 1}`}
                  className={cn(
                    "mx-auto grid size-7 place-items-center rounded-full border-[1.5px] transition-colors",
                    s.done ? "border-success bg-success text-white" : "border-line text-transparent hover:border-success/60 hover:text-success/60"
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </button>
                <button
                  onClick={() => removeSetFromActive(exerciseIdx, si)}
                  aria-label={`Remove set ${si + 1}`}
                  className={iconButtonClass("size-6 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100")}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addSetToActive(exerciseIdx)}
            className="mt-2 flex h-7 items-center gap-1.5 rounded-md px-1 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <Plus className="size-3.5" /> Add set
          </button>
        </div>
      )}
    </Card>
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
    <Card className="overflow-hidden">
      <CardHeader
        title={day?.label ? `${day.label} day` : "Rest day"}
        meta={[`${exercises.length} exercises`, lastSessionDate && `last done ${lastSessionDate}`].filter(Boolean).join(" · ")}
      />
      {exercises.length > 0 ? (
        <>
          <div className="grid grid-cols-[1fr_80px_80px] border-b border-line px-4 py-2 text-[11px] font-medium text-subtle">
            <span>Exercise</span>
            <span className="text-center">Sets × reps</span>
            <span className="text-right">Last weight</span>
          </div>
          <div className="divide-y divide-line">
            {exercises.map((ex) => (
              <div key={ex.id} className="grid grid-cols-[1fr_80px_80px] items-center px-4 py-2.5">
                <button
                  onClick={() => onOpenHistory(ex)}
                  title={`Open ${ex.name} history`}
                  aria-label={`Open ${ex.name} history`}
                  className="truncate text-left text-sm text-ink transition-colors hover:text-accent"
                >
                  {ex.name}
                </button>
                <span className="text-center text-xs tabular-nums text-muted">{ex.defaultSets} × {ex.defaultReps}</span>
                <span className="text-right text-xs tabular-nums text-ink">
                  {ex.lastWeight === 0 ? <span className="text-subtle">—</span> : `${displayWeight(ex.lastWeight, gymWeightUnit)} ${gymWeightUnit}`}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-3">
            <Button variant="primary" className="w-full" onClick={onStart}>
              Start workout
            </Button>
          </div>
        </>
      ) : (
        <EmptyState icon={Dumbbell} title="Nothing planned" description="Add exercises to this day from Edit split." />
      )}
    </Card>
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
  const todayPlan = gymDays.find((d) => d.dayIndex === today);
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
    <Page width="wide">
      <PageHeader
        title="Gym"
        description={
          isActive
            ? `${activeGymSession.dayLabel} in progress · ${totalDone}/${totalSets} sets · ${elapsed}`
            : todayPlan?.label ? `Today is ${todayPlan.label.toLowerCase()} day` : "Rest day"
        }
        actions={
          <>
            <Segmented
              size="sm"
              label="Weight unit"
              value={gymWeightUnit}
              onChange={setGymWeightUnit}
              options={[{ value: "lbs", label: "lbs" }, { value: "kg", label: "kg" }]}
            />
            <Button size="sm" onClick={() => setPanel((p) => p === "split" ? "none" : "split")}>
              <Settings2 className="size-3.5" />
              Edit split
            </Button>
          </>
        }
      />

      <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        {gymDays.map((d) => {
          const isToday = d.dayIndex === today;
          const isSelected = d.dayIndex === selectedDay;
          const hasActive = isActive && gymDays.find((day) => day.label === activeGymSession?.dayLabel)?.dayIndex === d.dayIndex;
          return (
            <button
              key={d.dayIndex}
              onClick={() => setSelectedDay(d.dayIndex)}
              className={cn(
                "relative flex h-12 min-w-[64px] shrink-0 flex-col items-center justify-center rounded-xl px-3 transition-colors",
                isSelected ? "bg-ink text-paper" : "bg-panel text-ink ring-1 ring-inset ring-line hover:bg-hover"
              )}
            >
              <span className={cn("text-[11px] font-medium", isSelected ? "text-paper/70" : isToday ? "text-now" : "text-subtle")}>{DAY_LABELS[d.dayIndex]}</span>
              <span className="text-[13px] font-medium">{d.label}</span>
              {hasActive && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-success" />}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          {isActive && activeOnSelectedDay ? (
            <>
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

              {showAddExercise ? (
                <Card className="p-3">
                  <input
                    autoFocus
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowAddExercise(false); setAddQuery(""); } }}
                    placeholder="Search exercises…"
                    aria-label="Search exercises"
                    className={inputClass}
                  />
                  {addQuery.trim() && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-line">
                      {catalogSearchResults.map((ex) => (
                        <button
                          key={ex.id}
                          onMouseDown={() => { addExerciseToActive(ex.id); setAddQuery(""); setShowAddExercise(false); }}
                          className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-sm text-ink last:border-b-0 hover:bg-hover/60"
                        >
                          <span>{ex.name}</span>
                          <span className="ml-auto text-xs tabular-nums text-muted">{displayWeight(ex.lastWeight, gymWeightUnit)} {gymWeightUnit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setShowAddExercise(false); setAddQuery(""); }}>
                    Cancel
                  </Button>
                </Card>
              ) : (
                <button
                  onClick={() => setShowAddExercise(true)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-muted transition-colors hover:border-subtle hover:text-ink"
                >
                  <Plus className="size-4" /> Add exercise
                </button>
              )}

              {finishConfirm ? (
                <Card className="p-4 text-center">
                  <p className="text-sm text-ink">{totalDone} of {totalSets} sets completed. Save this session?</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <Button size="sm" onClick={() => setFinishConfirm(false)}>Keep going</Button>
                    <Button size="sm" variant="primary" onClick={() => { finishGymSession(); setFinishConfirm(false); }}>Save workout</Button>
                  </div>
                </Card>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" className="h-10 flex-1" onClick={() => setFinishConfirm(true)}>
                    Finish workout
                  </Button>
                  <Button className="h-10" onClick={cancelGymSession}>
                    Discard
                  </Button>
                </div>
              )}
            </>
          ) : isActive && !activeOnSelectedDay ? (
            <Card className="p-5 text-center">
              <p className="text-sm text-ink">Your <strong>{activeGymSession?.dayLabel}</strong> workout is still in progress.</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  const d = gymDays.find((day) => day.label === activeGymSession?.dayLabel);
                  if (d) setSelectedDay(d.dayIndex);
                }}
              >
                Back to workout
              </Button>
            </Card>
          ) : (
            <DayPreview
              dayIndex={selectedDay}
              onStart={() => startGymSession(selectedDay)}
              onOpenHistory={openHistory}
            />
          )}
        </div>

        <div className="space-y-5">
          {panel !== "none" && (
            <Card className="p-4">
              {panel === "split" && <SplitEditor onClose={() => setPanel("none")} />}
              {panel === "history" && historyExercise && (
                <ExerciseHistory
                  exercise={historyExercise}
                  sessions={gymSessions}
                  unit={gymWeightUnit}
                  onClose={() => { setPanel("none"); setHistoryExercise(null); }}
                />
              )}
            </Card>
          )}

          <Card className="overflow-hidden">
            <CardHeader title="Recent sessions" meta={gymSessions.length ? `${gymSessions.length} total` : undefined} />
            {gymSessions.length > 0 ? (
              <div className="divide-y divide-line">
                {gymSessions.slice(0, 5).map((session) => {
                  const totalSetsLog = session.exercises.reduce((s, e) => s + e.sets.filter((set) => set.done).length, 0);
                  const dur = Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000);
                  return (
                    <div key={session.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{session.dayLabel}</p>
                        <p className="text-xs text-muted">
                          {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {" · "}{session.exercises.length} exercises · {totalSetsLog} sets
                        </p>
                      </div>
                      <span className="text-xs tabular-nums text-muted">{dur}m</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-muted">Finished workouts show up here.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <GymProgressCharts />
      </div>
    </Page>
  );
}
