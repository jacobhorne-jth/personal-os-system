"use client";

import { useMemo, useState } from "react";
import { Check, Flame, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import type { Habit, HabitType } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type EditState = {
  id: string | "new";
  title: string;
  type: HabitType;
  target: number;
  unit: string;
  responsibilityId: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStreak(habit: Habit, allLogs: ReturnType<typeof useAppStore.getState>["habitLogs"]): number {
  if (habit.type === "weekly") return 0;
  const today = todayStr();
  let streak = 0;
  const check = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = check.toISOString().slice(0, 10);
    const log = allLogs.find((l) => l.habitId === habit.id && l.date === dateStr);
    const value = log?.value ?? 0;
    if (habit.type === "avoid") {
      if (value === 1) break;
    } else if (habit.type === "limit") {
      // streak = consecutive clean days (at or under cap); no log = 0 = clean
      if (value > habit.target) break;
    } else {
      if (value < habit.target) break;
    }
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function HabitCell({
  habit,
  date,
  value,
  isFuture,
  isToday,
  onClick,
}: {
  habit: Habit;
  date: string;
  value: number;
  isFuture: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const exceeded = habit.type === "limit" && value > habit.target;
  const failed = habit.type === "avoid" && value === 1;
  const done = habit.type === "avoid" ? !failed : habit.type === "limit" ? false : value >= habit.target;

  let bg = "bg-line border-line";
  if (!isFuture) {
    if (habit.type === "avoid") {
      bg = failed ? "bg-red-500/20 border-red-500/40" : "bg-emerald-500/15 border-emerald-500/30";
    } else if (habit.type === "limit") {
      if (exceeded) bg = "bg-red-500/20 border-red-500/40";
      else if (value > 0) bg = "bg-emerald-500/15 border-emerald-500/30";
    } else if (done) {
      bg = "bg-mint/20 border-mint/40";
    } else if (value > 0) {
      bg = "bg-blue/15 border-blue/30";
    }
  }

  return (
    <button
      onClick={isFuture ? undefined : onClick}
      disabled={isFuture}
      className={cn(
        "relative flex h-10 w-10 flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition",
        bg,
        isFuture ? "cursor-default opacity-30" : "hover:opacity-80 active:scale-95",
        isToday && "ring-1 ring-blue/50 ring-offset-1 ring-offset-paper"
      )}
    >
      {habit.type === "avoid" ? (
        failed ? <X className="size-3.5 text-red-400" /> : <Check className="size-3.5 text-emerald-400 opacity-60" />
      ) : habit.type === "limit" ? (
        value === 0 ? null : (
          <span className={cn("leading-none", exceeded ? "text-red-400" : "text-emerald-400")}>
            {value}/{habit.target}
          </span>
        )
      ) : habit.target === 1 ? (
        done ? <Check className="size-3.5 text-mint" /> : null
      ) : (
        <span className={cn("leading-none", done ? "text-mint" : value > 0 ? "text-blue" : "text-muted")}>
          {value}/{habit.target}
        </span>
      )}
    </button>
  );
}

export function HabitsBoard() {
  const habits = useAppStore((s) => s.habits);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const addHabit = useAppStore((s) => s.addHabit);
  const updateHabit = useAppStore((s) => s.updateHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const logHabit = useAppStore((s) => s.logHabit);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(), []);
  const today = todayStr();

  function startNew() {
    setEditing({ id: "new", title: "", type: "daily", target: 1, unit: "", responsibilityId: "" });
  }

  function startEdit(h: Habit) {
    setDeleteConfirm(null);
    setEditing({ id: h.id, title: h.title, type: h.type, target: h.target, unit: h.unit ?? "", responsibilityId: h.responsibilityId ?? "" });
  }

  function cancelEdit() {
    setEditing(null);
    setDeleteConfirm(null);
  }

  function saveEdit() {
    if (!editing?.title.trim()) return;
    const input = {
      title: editing.title.trim(),
      type: editing.type,
      target: editing.target,
      unit: editing.unit.trim() || undefined,
      responsibilityId: editing.responsibilityId || undefined,
    };
    if (editing.id === "new") {
      addHabit(input);
    } else {
      updateHabit(editing.id, input);
    }
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      deleteHabit(id);
      setDeleteConfirm(null);
      if (editing?.id === id) setEditing(null);
    } else {
      setDeleteConfirm(id);
    }
  }

  function handleCellClick(habit: Habit, date: string) {
    const log = habitLogs.find((l) => l.habitId === habit.id && l.date === date);
    const current = log?.value ?? 0;
    let next: number;
    if (habit.type === "avoid" || habit.type === "weekly") {
      next = current === 1 ? 0 : 1;
    } else if (habit.type === "limit") {
      // increment up to target+3 (shows overages), then wrap to 0
      next = current >= habit.target + 3 ? 0 : current + 1;
    } else {
      next = current >= habit.target ? 0 : current + 1;
    }
    logHabit(habit.id, date, next);
  }

  function weeklyTotal(habit: Habit): number {
    return weekDates.reduce((sum, date) => {
      const log = habitLogs.find((l) => l.habitId === habit.id && l.date === date);
      return sum + (log?.value ?? 0);
    }, 0);
  }

  const typeLabels: Record<HabitType, string> = {
    daily: "Daily",
    weekly: "Weekly",
    avoid: "Avoid",
    limit: "Limit",
  };

  const typeHints: Record<HabitType, string> = {
    daily: "Do it N times every day. Each cell cycles through 0 → target.",
    weekly: "Do it N times this week. Each cell marks one occurrence.",
    avoid: "Don't do it. Each cell marks a failure (red) or clean day (green).",
    limit: "Stay at or under N per day. Each click logs one occurrence — turns red if you exceed the cap.",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Habits</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Weekly tracker</h1>
          <p className="mt-2 text-sm text-muted">Track what you do, what you skip, and what you avoid.</p>
        </div>
        <button
          onClick={startNew}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-panel"
        >
          <Plus className="size-4" />
          Add habit
        </button>
      </header>

      {/* Add / edit form */}
      {editing && (
        <div className="rounded-xl border border-blue/40 bg-panel p-4 shadow-glow">
          <p className="mb-3 text-xs font-medium text-blue">{editing.id === "new" ? "New habit" : "Edit habit"}</p>
          <div className="space-y-3">
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
              placeholder="Habit name (e.g. Drink enough water)"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
            />

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2">
              {(["daily", "weekly", "avoid", "limit"] as HabitType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setEditing((s) => s && { ...s, type: t, target: t === "avoid" ? 0 : 1 })}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition",
                    editing.type === t
                      ? "border-blue bg-blue/10 text-blue"
                      : "border-line bg-paper text-muted hover:text-ink"
                  )}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">{typeHints[editing.type]}</p>

            {/* Target + unit (not for avoid) */}
            {editing.type !== "avoid" && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-muted">{editing.type === "limit" ? "Max per day" : "Target"}</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editing.target}
                    onChange={(e) => setEditing((s) => s && { ...s, target: Math.max(1, Number(e.target.value)) })}
                    className="w-20 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[11px] text-muted">Unit (optional)</label>
                  <input
                    value={editing.unit}
                    onChange={(e) => setEditing((s) => s && { ...s, unit: e.target.value })}
                    placeholder="oz, pages, times…"
                    className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                </div>
              </div>
            )}

            {/* Responsibility */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">Label (optional)</label>
              <select
                value={editing.responsibilityId}
                onChange={(e) => setEditing((s) => s && { ...s, responsibilityId: e.target.value })}
                className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
              >
                <option value="">— none —</option>
                {responsibilities.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={!editing.title.trim()}
                className="flex-1 rounded-lg bg-blue py-2 text-xs font-medium text-white disabled:opacity-40"
              >
                {editing.id === "new" ? "Create habit" : "Save changes"}
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-lg border border-line bg-paper px-3 py-2 text-xs text-muted hover:text-ink"
              >
                Cancel
              </button>
              {editing.id !== "new" && (
                <button
                  onClick={() => handleDelete(editing.id as string)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs transition",
                    deleteConfirm === editing.id
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-line bg-paper text-muted hover:border-red-500/40 hover:text-red-400"
                  )}
                >
                  {deleteConfirm === editing.id ? "Confirm delete" : <Trash2 className="size-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Habit grid */}
      {habits.length === 0 && !editing ? (
        <div className="rounded-xl border border-line bg-panel p-8 text-center">
          <p className="text-sm text-muted">No habits yet.</p>
          <button onClick={startNew} className="mt-3 text-sm text-blue hover:underline">Add your first habit →</button>
        </div>
      ) : habits.length > 0 && (
        <div className="rounded-xl border border-line bg-panel overflow-hidden">
          {/* Day header */}
          <div className="grid border-b border-line bg-line px-4 py-2" style={{ gridTemplateColumns: "1fr repeat(7, 44px) 72px" }}>
            <div />
            {weekDates.map((date, i) => {
              const d = new Date(date + "T12:00:00");
              const isT = date === today;
              return (
                <div key={date} className={cn("flex flex-col items-center gap-0.5 text-center", isT ? "text-blue" : "text-muted")}>
                  <span className="text-[10px] font-medium">{DAY_LABELS[i]}</span>
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px]", isT && "bg-blue text-white font-semibold")}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-line">
            {habits.map((habit) => {
              const tone = habit.responsibilityId
                ? responsibilityTone[responsibilities.find((r) => r.id === habit.responsibilityId)?.color ?? "graphite"]
                : responsibilityTone.graphite;
              const streak = getStreak(habit, habitLogs);
              const total = habit.type === "weekly" ? weeklyTotal(habit) : null;
              const todayLog = habitLogs.find((l) => l.habitId === habit.id && l.date === today);
              const todayValue = todayLog?.value ?? 0;

              return (
                <div
                  key={habit.id}
                  className="group grid items-center gap-2 px-4 py-3"
                  style={{ gridTemplateColumns: "1fr repeat(7, 44px) 72px" }}
                >
                  {/* Name column */}
                  <div className="flex min-w-0 items-center gap-2 pr-2">
                    <button
                      onClick={() => startEdit(habit)}
                      className="shrink-0 rounded p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-line hover:text-ink"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{habit.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: `${tone.hex}20`, color: tone.hex }}
                        >
                          {habit.type === "avoid" ? "avoid" : habit.type === "limit" ? `≤${habit.target}/day` : habit.type === "weekly" ? `${habit.target}×/wk` : habit.target === 1 ? "daily" : `${habit.target}×/day`}
                          {habit.unit ? ` · ${habit.unit}` : ""}
                        </span>
                        {habit.responsibilityId && (
                          <span className="truncate text-[10px] text-muted">
                            {responsibilities.find((r) => r.id === habit.responsibilityId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {weekDates.map((date) => {
                    const log = habitLogs.find((l) => l.habitId === habit.id && l.date === date);
                    const isFuture = date > today;
                    const isT = date === today;
                    return (
                      <div key={date} className="flex justify-center">
                        <HabitCell
                          habit={habit}
                          date={date}
                          value={log?.value ?? 0}
                          isFuture={isFuture}
                          isToday={isT}
                          onClick={() => handleCellClick(habit, date)}
                        />
                      </div>
                    );
                  })}

                  {/* Streak / total column */}
                  <div className="flex flex-col items-center justify-center gap-0.5 pl-1 text-center">
                    {habit.type === "weekly" ? (
                      <>
                        <span className={cn("text-sm font-semibold", total! >= habit.target ? "text-mint" : "text-ink")}>
                          {total}/{habit.target}
                        </span>
                        <span className="text-[9px] text-muted">this week</span>
                      </>
                    ) : habit.type === "limit" ? (
                      <>
                        <span className={cn("text-sm font-semibold", todayValue > habit.target ? "text-red-400" : "text-ink")}>
                          {todayValue}/{habit.target}
                        </span>
                        <span className="text-[9px] text-muted">today</span>
                      </>
                    ) : (
                      <>
                        {streak > 0 && <Flame className="size-3 text-orange-400" />}
                        <span className="text-sm font-semibold text-ink">{streak}</span>
                        <span className="text-[9px] text-muted">streak</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
