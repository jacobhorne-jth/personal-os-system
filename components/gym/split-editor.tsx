"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LABEL_OPTIONS = ["Push", "Pull", "Legs", "Abs", "Upper", "Lower", "Full Body", "Cardio", "Rest"];

export function SplitEditor({ onClose }: { onClose: () => void }) {
  const gymExercises = useAppStore((s) => s.gymExercises);
  const gymDays = useAppStore((s) => s.gymDays);
  const setDayExercises = useAppStore((s) => s.setDayExercises);
  const setDayLabel = useAppStore((s) => s.setDayLabel);
  const addGymExercise = useAppStore((s) => s.addGymExercise);

  const [selectedDay, setSelectedDay] = useState(0);
  const [addQuery, setAddQuery] = useState("");
  const [showAddBox, setShowAddBox] = useState(false);

  const day = gymDays.find((d) => d.dayIndex === selectedDay);
  const dayExercises = day?.exerciseIds.map((eid) => gymExercises.find((e) => e.id === eid)).filter(Boolean) ?? [];

  const catalogMatches = gymExercises.filter(
    (e) =>
      e.name.toLowerCase().includes(addQuery.toLowerCase()) &&
      !day?.exerciseIds.includes(e.id)
  );

  function addExerciseById(exerciseId: string) {
    if (!day) return;
    setDayExercises(day.dayIndex, [...day.exerciseIds, exerciseId]);
    setAddQuery("");
    setShowAddBox(false);
  }

  function createAndAdd() {
    if (!addQuery.trim() || !day) return;
    const ex = addGymExercise({ name: addQuery.trim(), defaultSets: 3, defaultReps: 10 });
    setDayExercises(day.dayIndex, [...day.exerciseIds, ex.id]);
    setAddQuery("");
    setShowAddBox(false);
  }

  function removeExercise(exerciseId: string) {
    if (!day) return;
    setDayExercises(day.dayIndex, day.exerciseIds.filter((id) => id !== exerciseId));
  }

  function moveExercise(exerciseId: string, dir: -1 | 1) {
    if (!day) return;
    const ids = [...day.exerciseIds];
    const i = ids.indexOf(exerciseId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setDayExercises(day.dayIndex, ids);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Edit split</h2>
        <button onClick={onClose} className="rounded p-1 text-muted hover:bg-line hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {gymDays.map((d) => (
          <button
            key={d.dayIndex}
            onClick={() => { setSelectedDay(d.dayIndex); setShowAddBox(false); setAddQuery(""); }}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-xs transition",
              selectedDay === d.dayIndex
                ? "border-blue bg-blue/10 text-blue"
                : "border-line bg-paper text-muted hover:text-ink"
            )}
          >
            <span className="font-medium">{DAY_NAMES[d.dayIndex]}</span>
            <span className="text-[10px] opacity-80">{d.label}</span>
          </button>
        ))}
      </div>

      {day && (
        <>
          {/* Day label */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Day label:</span>
            <select
              value={day.label}
              onChange={(e) => setDayLabel(day.dayIndex, e.target.value)}
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
            >
              {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value={day.label}>{day.label}</option>
            </select>
          </div>

          {/* Exercise list */}
          <div className="rounded-lg border border-line overflow-hidden">
            {dayExercises.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted">No exercises — add some below.</p>
            ) : (
              <div className="divide-y divide-line">
                {dayExercises.map((ex, i) => ex && (
                  <div key={ex.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveExercise(ex.id, -1)}
                        disabled={i === 0}
                        className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-20"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        onClick={() => moveExercise(ex.id, 1)}
                        disabled={i === dayExercises.length - 1}
                        className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-20"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink">{ex.name}</p>
                      <p className="text-[11px] text-muted">{ex.defaultSets}×{ex.defaultReps}{ex.muscleGroup ? ` · ${ex.muscleGroup}` : ""}</p>
                    </div>
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="rounded p-1 text-muted hover:bg-line hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add exercise */}
          {showAddBox ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setShowAddBox(false); setAddQuery(""); } }}
                placeholder="Search or name a new exercise…"
                className="w-full rounded-lg border border-blue bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
              {addQuery.trim() && (
                <div className="rounded-lg border border-line bg-paper overflow-hidden">
                  {catalogMatches.slice(0, 6).map((ex) => (
                    <button
                      key={ex.id}
                      onMouseDown={() => addExerciseById(ex.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-line"
                    >
                      <span>{ex.name}</span>
                      <span className="ml-auto text-[11px] text-muted">{ex.muscleGroup}</span>
                    </button>
                  ))}
                  <button
                    onMouseDown={createAndAdd}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue hover:bg-line border-t border-line"
                  >
                    <Plus className="size-3.5" />
                    Create &quot;{addQuery.trim()}&quot;
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAddBox(true)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-sm text-muted hover:border-blue/50 hover:text-blue transition"
            >
              <Plus className="size-4" />
              Add exercise
            </button>
          )}
        </>
      )}
    </div>
  );
}
