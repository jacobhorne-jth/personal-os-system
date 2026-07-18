"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Flame, Pencil, Plus, Trash2, X } from "lucide-react";
import { addDays, effectiveDateKey, effectiveDateKeyOf, effectiveNow, localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
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

type HabitLogs = ReturnType<typeof useAppStore.getState>["habitLogs"];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOfWeek(offsetWeeks: number): string {
  const today = effectiveNow();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  return localDateKey(monday);
}

function getWeekDates(offsetWeeks: number): string[] {
  const monday = mondayOfWeek(offsetWeeks);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function findLog(logs: HabitLogs, habitId: string, date: string) {
  return logs.find((l) => l.habitId === habitId && l.date === date);
}

function logValue(logs: HabitLogs, habitId: string, date: string): number {
  return findLog(logs, habitId, date)?.value ?? 0;
}

// Whether a day counts toward the streak (no log on avoid/limit days is clean)
function dayCounts(habit: Habit, value: number): boolean {
  if (habit.type === "avoid") return value !== 1;
  if (habit.type === "limit") return value <= habit.target;
  return value >= habit.target;
}

function getStreak(habit: Habit, allLogs: HabitLogs): number {
  if (habit.type === "weekly") return 0;
  const createdDate = effectiveDateKeyOf(new Date(habit.createdAt));
  let streak = 0;
  let dateStr = effectiveDateKey();
  // Today is pending, not failed: an unchecked today doesn't break the
  // streak — counting just starts from yesterday until it's done
  if (!dayCounts(habit, logValue(allLogs, habit.id, dateStr))) {
    dateStr = addDays(dateStr, -1);
  }
  for (let i = 0; i < 365; i++) {
    const log = findLog(allLogs, habit.id, dateStr);
    // Days before the habit existed only count when explicitly backfilled —
    // implicit "clean" days (avoid/limit with no log) can't inflate streaks
    if (dateStr < createdDate && !log) break;
    if (!dayCounts(habit, log?.value ?? 0)) break;
    streak++;
    dateStr = addDays(dateStr, -1);
  }
  return streak;
}

function getStats(habit: Habit, allLogs: HabitLogs) {
  const today = effectiveDateKey();
  const createdDate = effectiveDateKeyOf(new Date(habit.createdAt));
  let best = 0;
  let run = 0;
  let successDays = 0;
  let windowDays = 0;
  let windowSuccess = 0;
  let totalDone = 0;
  const windowStart = addDays(today, -29);
  // Stats start at creation or the earliest backfilled log, whichever is older
  const firstLogDate = allLogs
    .filter((l) => l.habitId === habit.id)
    .reduce<string | null>((min, l) => (min === null || l.date < min ? l.date : min), null);
  const startDate = firstLogDate && firstLogDate < createdDate ? firstLogDate : createdDate;
  for (let dateStr = startDate; dateStr <= today; dateStr = addDays(dateStr, 1)) {
    const log = findLog(allLogs, habit.id, dateStr);
    const value = log?.value ?? 0;
    // Pre-creation days without an explicit log were simply untracked
    if (dateStr < createdDate && !log) {
      run = 0;
      continue;
    }
    totalDone += habit.type === "avoid" ? 0 : value;
    const ok = dayCounts(habit, value);
    // Today is pending until done — don't count it as a miss anywhere
    if (dateStr === today && !ok) continue;
    if (ok) {
      successDays++;
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    if (dateStr >= windowStart) {
      windowDays++;
      if (ok) windowSuccess++;
    }
  }
  return {
    best,
    successDays,
    totalDone,
    rate30: windowDays > 0 ? Math.round((windowSuccess / windowDays) * 100) : 0,
  };
}

function dayStatus(habit: Habit, value: number): "success" | "partial" | "fail" | "none" {
  if (habit.type === "avoid") return value === 1 ? "fail" : "success";
  if (habit.type === "limit") return value > habit.target ? "fail" : value > 0 ? "success" : "none";
  if (habit.type === "weekly") return value > 0 ? "success" : "none";
  return value >= habit.target ? "success" : value > 0 ? "partial" : "none";
}

const STATUS_COLORS: Record<string, string> = {
  success: "#34a853",
  partial: "#4285f4",
  fail: "#d93025",
  none: "rgba(255,255,255,0.07)",
};

// GitHub-style history: the last `weeks` weeks as columns, Mon→Sun rows
function HistoryHeatmap({ habit, logs, weeks = 13 }: { habit: Habit; logs: HabitLogs; weeks?: number }) {
  const today = effectiveDateKey();
  const createdDate = effectiveDateKeyOf(new Date(habit.createdAt));
  const firstMonday = addDays(mondayOfWeek(0), -(weeks - 1) * 7);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="flex flex-col gap-[3px]">
          {Array.from({ length: 7 }, (_, d) => {
            const dateStr = addDays(firstMonday, w * 7 + d);
            if (dateStr > today) return <span key={d} className="size-2.5 rounded-[3px] opacity-0" />;
            const log = findLog(logs, habit.id, dateStr);
            const beforeCreation = dateStr < createdDate && !log;
            const status = beforeCreation ? "none" : dayStatus(habit, log?.value ?? 0);
            return (
              <span
                key={d}
                title={`${dateStr}`}
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: STATUS_COLORS[status], opacity: beforeCreation ? 0.35 : 1 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Circular progress ring used by the Today check-off row
function ProgressRing({ progress, color, children }: { progress: number; color: string; children: React.ReactNode }) {
  const R = 20;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative grid size-12 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.min(1, progress))}
          className="transition-all duration-300"
        />
      </svg>
      {children}
    </span>
  );
}

function HabitCell({
  habit,
  value,
  isFuture,
  isToday,
  onClick,
}: {
  habit: Habit;
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const today = effectiveDateKey();

  const weekLabel = useMemo(() => {
    const fmt = (key: string) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    return `${fmt(weekDates[0])} – ${fmt(weekDates[6])}`;
  }, [weekDates]);

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

  const [numericEntry, setNumericEntry] = useState<{ habitId: string; date: string } | null>(null);
  const [numericValue, setNumericValue] = useState("");

  // Right-click on a countable cell sets the exact count without click-cycling
  function commitNumericEntry(habit: Habit, date: string) {
    const parsed = Math.max(0, Math.min(999, parseInt(numericValue) || 0));
    logHabit(habit.id, date, parsed);
    setNumericEntry(null);
  }

  function handleCellClick(habit: Habit, date: string) {
    const current = logValue(habitLogs, habit.id, date);
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
    return weekDates.reduce((sum, date) => sum + logValue(habitLogs, habit.id, date), 0);
  }

  const typeLabels: Record<HabitType, string> = {
    daily: "Daily",
    weekly: "Weekly",
    avoid: "Avoid",
    limit: "Limit",
  };

  const typeHints: Record<HabitType, string> = {
    daily: "Do it N times every day. Click to count up, right-click to type an exact number.",
    weekly: "Do it N times this week. Each cell marks one occurrence.",
    avoid: "Don't do it. Each cell marks a failure (red) or clean day (green).",
    limit: "Stay at or under N per day. Click to log one, right-click to type a count — red when over the cap.",
  };

  const todayDone = habits.filter((h) => {
    const v = logValue(habitLogs, h.id, today);
    return h.type === "weekly" ? weeklyTotal(h) >= h.target : dayCounts(h, v) && (h.type !== "daily" || v >= h.target);
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Habits</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            {effectiveNow().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {habits.length > 0 ? `${todayDone} of ${habits.length} on track today` : "Track what you do, what you skip, and what you avoid."}
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-panel"
        >
          <Plus className="size-4" />
          Add habit
        </button>
      </header>

      {/* Today: one-tap check-off, like a classic habit tracker */}
      {habits.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Today</p>
          <div className="flex flex-wrap gap-4">
            {habits.map((habit) => {
              const value = logValue(habitLogs, habit.id, today);
              const tone = habit.responsibilityId
                ? getTone(responsibilities.find((r) => r.id === habit.responsibilityId)?.color ?? "graphite")
                : getTone("mint");
              const failed = habit.type === "avoid" && value === 1;
              const exceeded = habit.type === "limit" && value > habit.target;
              const isWeekly = habit.type === "weekly";
              const current = isWeekly ? weeklyTotal(habit) : value;
              const target = habit.type === "avoid" ? 1 : habit.target;
              const complete = habit.type === "avoid" ? !failed : habit.type === "limit" ? !exceeded && value > 0 : current >= target;
              const progress = habit.type === "avoid" ? (failed ? 0 : 1) : habit.type === "limit" ? (value > 0 ? 1 : 0) : current / target;
              const ringColor = failed || exceeded ? "#d93025" : complete ? tone.hex : "#4285f4";
              return (
                <button
                  key={habit.id}
                  onClick={() => handleCellClick(habit, today)}
                  onContextMenu={(e) => {
                    if (habit.type !== "daily" && habit.type !== "limit") return;
                    e.preventDefault();
                    setNumericValue(String(value));
                    setNumericEntry({ habitId: habit.id, date: today });
                  }}
                  className="group/today flex w-16 flex-col items-center gap-1.5 transition active:scale-95"
                  title={habit.title}
                >
                  <ProgressRing progress={progress} color={ringColor}>
                    {failed || exceeded ? (
                      <X className="size-4 text-red-400" />
                    ) : complete ? (
                      <Check className="size-4" style={{ color: ringColor }} />
                    ) : (
                      <span className="text-[11px] font-semibold text-ink">
                        {habit.type === "avoid" ? <Check className="size-4 opacity-40" /> : target === 1 ? "" : `${current}/${target}`}
                      </span>
                    )}
                  </ProgressRing>
                  <span className="w-full truncate text-center text-[10px] leading-tight text-muted group-hover/today:text-ink">
                    {habit.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                {responsibilities.filter((resp) => !resp.archivedAt).map((r) => (
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
          {/* Week navigation */}
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-sm font-medium text-ink">{weekLabel}</p>
            <div className="flex items-center gap-1">
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink transition hover:bg-line"
                >
                  This week
                </button>
              )}
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="grid size-7 place-items-center rounded-md text-muted transition hover:bg-line hover:text-ink"
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                disabled={weekOffset >= 0}
                className="grid size-7 place-items-center rounded-md text-muted transition hover:bg-line hover:text-ink disabled:opacity-30"
                aria-label="Next week"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Day header */}
          <div className="grid border-b border-line bg-line px-4 py-2" style={{ gridTemplateColumns: "1fr repeat(7, 44px) 72px" }}>
            <div />
            {weekDates.map((date, i) => {
              const [y, m, d] = date.split("-").map(Number);
              const isT = date === today;
              return (
                <div key={date} className={cn("flex flex-col items-center gap-0.5 text-center", isT ? "text-blue" : "text-muted")}>
                  <span className="text-[10px] font-medium">{DAY_LABELS[i]}</span>
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px]", isT && "bg-blue text-white font-semibold")}>
                    {new Date(y, m - 1, d).getDate()}
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
                ? getTone(responsibilities.find((r) => r.id === habit.responsibilityId)?.color ?? "graphite")
                : getTone("graphite");
              const streak = getStreak(habit, habitLogs);
              const total = habit.type === "weekly" ? weeklyTotal(habit) : null;
              const todayValue = logValue(habitLogs, habit.id, today);
              const expanded = expandedId === habit.id;

              return (
                <div key={habit.id}>
                  <div
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
                      <button onClick={() => setExpandedId(expanded ? null : habit.id)} className="min-w-0 text-left">
                        <p className="flex items-center gap-1 truncate text-sm font-medium text-ink">
                          {habit.title}
                          <ChevronDown className={cn("size-3 shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
                        </p>
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
                      </button>
                    </div>

                    {/* Day cells */}
                    {weekDates.map((date) => {
                      const value = logValue(habitLogs, habit.id, date);
                      const isFuture = date > today;
                      const isT = date === today;
                      const countable = habit.type === "daily" || habit.type === "limit";
                      const isNumericTarget = numericEntry?.habitId === habit.id && numericEntry?.date === date;
                      return (
                        <div
                          key={date}
                          className="flex justify-center"
                          onContextMenu={(e) => {
                            if (!countable || isFuture) return;
                            e.preventDefault();
                            setNumericValue(String(value));
                            setNumericEntry({ habitId: habit.id, date });
                          }}
                        >
                          {isNumericTarget ? (
                            <input
                              autoFocus
                              type="number"
                              min={0}
                              max={999}
                              value={numericValue}
                              onChange={(e) => setNumericValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitNumericEntry(habit, date);
                                if (e.key === "Escape") setNumericEntry(null);
                              }}
                              onBlur={() => commitNumericEntry(habit, date)}
                              className="h-8 w-12 rounded-md border border-blue bg-paper text-center text-xs text-ink outline-none"
                            />
                          ) : (
                            <HabitCell
                              habit={habit}
                              value={value}
                              isFuture={isFuture}
                              isToday={isT}
                              onClick={() => handleCellClick(habit, date)}
                            />
                          )}
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

                  {/* Expanded stats + history */}
                  {expanded && (
                    <div className="border-t border-line/60 bg-paper/40 px-4 py-4">
                      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                        {(() => {
                          const stats = getStats(habit, habitLogs);
                          const statItems: Array<[string, string]> =
                            habit.type === "weekly"
                              ? [
                                  ["This week", `${total}/${habit.target}`],
                                  ["Total logged", `${stats.totalDone}${habit.unit ? ` ${habit.unit}` : ""}`],
                                ]
                              : [
                                  ["Current streak", `${streak}d`],
                                  ["Best streak", `${stats.best}d`],
                                  ["Last 30 days", `${stats.rate30}%`],
                                  habit.type === "avoid"
                                    ? ["Clean days", `${stats.successDays}`]
                                    : ["Total logged", `${stats.totalDone}${habit.unit ? ` ${habit.unit}` : ""}`],
                                ];
                          return (
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                              {statItems.map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-lg font-semibold text-ink">{value}</p>
                                  <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div className="ml-auto">
                          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted">Last 13 weeks</p>
                          <HistoryHeatmap habit={habit} logs={habitLogs} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
