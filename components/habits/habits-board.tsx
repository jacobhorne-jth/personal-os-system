"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Flame, Pencil, Plus, Repeat2, Trash2, X } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, Field, Page, PageHeader, Segmented, iconButtonClass, inputClass } from "@/components/ui/primitives";
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
  success: "rgb(var(--color-success))",
  partial: "rgb(var(--color-accent) / 0.55)",
  fail: "rgb(var(--color-danger))",
  none: "rgb(var(--color-hover))",
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
                style={{ backgroundColor: STATUS_COLORS[status], opacity: beforeCreation ? 0.5 : 1 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Circular progress ring used by the Today check-off tiles
function ProgressRing({ progress, color, children }: { progress: number; color: string; children: React.ReactNode }) {
  const R = 16;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={R} fill="none" stroke="rgb(var(--color-line))" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="3"
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
  // A weekly habit's day cell is one occurrence toward the weekly target
  const done =
    habit.type === "avoid" ? !failed :
    habit.type === "limit" ? false :
    habit.type === "weekly" ? value > 0 :
    value >= habit.target;

  let tone = "bg-hover/70 text-muted hover:bg-hover";
  if (!isFuture) {
    if (habit.type === "avoid") {
      tone = failed ? "bg-danger/15 text-danger" : "bg-success/10 text-success";
    } else if (habit.type === "limit") {
      if (exceeded) tone = "bg-danger/15 text-danger";
      else if (value > 0) tone = "bg-success/10 text-success";
    } else if (done) {
      tone = "bg-success/15 text-success";
    } else if (value > 0) {
      tone = "bg-accent/10 text-accent";
    }
  }

  return (
    <button
      onClick={isFuture ? undefined : onClick}
      disabled={isFuture}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-[10px] font-semibold tabular-nums transition-colors",
        tone,
        isFuture ? "cursor-default opacity-30" : "active:scale-95",
        isToday && "ring-1 ring-inset ring-ink/25"
      )}
    >
      {habit.type === "avoid" ? (
        failed ? <X className="size-3.5" strokeWidth={2.5} /> : <Check className="size-3.5 opacity-70" strokeWidth={2.5} />
      ) : habit.type === "limit" ? (
        value === 0 ? null : <span className="leading-none">{value}/{habit.target}</span>
      ) : habit.target === 1 || habit.type === "weekly" ? (
        done ? <Check className="size-3.5" strokeWidth={2.5} /> : null
      ) : (
        <span className="leading-none">{value}/{habit.target}</span>
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
    } else if (habit.target === 1) {
      next = current === 1 ? 0 : 1;
    } else {
      // Counting habits (pushups, glasses of water): the target is a floor,
      // not a cap — keep counting past it. Reset via right-click → 0.
      next = Math.min(999, current + 1);
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
    daily: "Do it N or more times every day — counting keeps going past the target. Click to count up, right-click to type an exact number (0 resets).",
    weekly: "Do it N times this week. Each cell marks one occurrence.",
    avoid: "Don't do it. Each cell marks a failure (red) or clean day (green).",
    limit: "Stay at or under N per day. Click to log one, right-click to type a count — red when over the cap.",
  };

  const todayDone = habits.filter((h) => {
    const v = logValue(habitLogs, h.id, today);
    return h.type === "weekly" ? weeklyTotal(h) >= h.target : dayCounts(h, v) && (h.type !== "daily" || v >= h.target);
  }).length;

  const gridColumns = "minmax(200px,1fr) repeat(7, 36px) 64px";

  return (
    <Page width="wide">
      <PageHeader
        title="Habits"
        description={habits.length ? `${todayDone} of ${habits.length} on track today` : "Small things, every day."}
        actions={
          <Button variant="primary" onClick={startNew}>
            <Plus className="size-4" />
            New habit
          </Button>
        }
      />

      {/* Add / edit form */}
      {editing && (
        <Card className="mb-6 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">{editing.id === "new" ? "New habit" : "Edit habit"}</p>
          <div className="space-y-4">
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
              placeholder="Habit name (e.g. Drink enough water)"
              aria-label="Habit name"
              className={inputClass}
            />

            <div>
              <Segmented
                label="Habit type"
                value={editing.type}
                onChange={(t) => setEditing((s) => s && { ...s, type: t, target: t === "avoid" ? 0 : 1 })}
                options={(["daily", "weekly", "avoid", "limit"] as HabitType[]).map((t) => ({ value: t, label: typeLabels[t] }))}
              />
              <p className="mt-2 text-xs leading-5 text-muted">{typeHints[editing.type]}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[100px_1fr_1fr]">
              {editing.type !== "avoid" && (
                <Field label={editing.type === "limit" ? "Max per day" : "Target"}>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editing.target}
                    onChange={(e) => setEditing((s) => s && { ...s, target: Math.max(1, Number(e.target.value)) })}
                    className={inputClass}
                  />
                </Field>
              )}
              {editing.type !== "avoid" && (
                <Field label="Unit (optional)">
                  <input
                    value={editing.unit}
                    onChange={(e) => setEditing((s) => s && { ...s, unit: e.target.value })}
                    placeholder="oz, pages, times…"
                    className={inputClass}
                  />
                </Field>
              )}
              <Field label="Label (optional)" className={editing.type === "avoid" ? "sm:col-span-3" : undefined}>
                <select
                  value={editing.responsibilityId}
                  onChange={(e) => setEditing((s) => s && { ...s, responsibilityId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {responsibilities.filter((resp) => !resp.archivedAt).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex items-center gap-2 border-t border-line pt-4">
              {editing.id !== "new" && (
                <Button variant="danger" size="sm" onClick={() => handleDelete(editing.id as string)}>
                  {deleteConfirm === editing.id ? "Confirm delete" : <><Trash2 className="size-3.5" />Delete</>}
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={cancelEdit}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={saveEdit} disabled={!editing.title.trim()}>
                  {editing.id === "new" ? "Create habit" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {habits.length === 0 && !editing ? (
        <Card>
          <EmptyState
            icon={Repeat2}
            title="No habits yet"
            description="Track something small you want to do — or avoid — every day."
            action={<Button variant="primary" onClick={startNew}><Plus className="size-4" />Create a habit</Button>}
          />
        </Card>
      ) : habits.length > 0 && (
        <>
          {/* Today: one-tap check-off */}
          <section className="mb-8">
            <h2 className="mb-2.5 px-1 text-[13px] font-semibold text-ink">Today</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {habits.map((habit) => {
                const value = logValue(habitLogs, habit.id, today);
                const tone = habit.responsibilityId
                  ? getTone(responsibilities.find((r) => r.id === habit.responsibilityId)?.color ?? "graphite")
                  : null;
                const failed = habit.type === "avoid" && value === 1;
                const exceeded = habit.type === "limit" && value > habit.target;
                const isWeekly = habit.type === "weekly";
                const current = isWeekly ? weeklyTotal(habit) : value;
                const target = habit.type === "avoid" ? 1 : habit.target;
                const complete = habit.type === "avoid" ? !failed : habit.type === "limit" ? !exceeded && value > 0 : current >= target;
                const progress = habit.type === "avoid" ? (failed ? 0 : 1) : habit.type === "limit" ? (value > 0 ? 1 : 0) : current / target;
                const ringColor = failed || exceeded ? "rgb(var(--color-danger))" : complete ? "rgb(var(--color-success))" : "rgb(var(--color-accent))";
                const detail =
                  isWeekly ? `${current}/${target} this week`
                  : habit.type === "avoid" ? (failed ? "Slipped" : "Clean")
                  : habit.type === "limit" ? `${value}/${habit.target} max`
                  : target > 1 ? `${current}/${target}${habit.unit ? ` ${habit.unit}` : ""}`
                  : complete ? "Done" : "Not yet";
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
                    className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3 text-left transition-colors hover:bg-hover/50 active:scale-[0.99]"
                    title={habit.title}
                  >
                    <ProgressRing progress={progress} color={ringColor}>
                      {failed || exceeded ? (
                        <X className="size-4 text-danger" strokeWidth={2.5} />
                      ) : complete ? (
                        <Check className="size-4 text-success" strokeWidth={2.5} />
                      ) : null}
                    </ProgressRing>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{habit.title}</span>
                      <span className={cn("flex items-center gap-1.5 text-xs", failed || exceeded ? "text-danger" : "text-muted")}>
                        {tone && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />}
                        {detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <Card className="overflow-hidden">
            <CardHeader
              title="This week"
              meta={weekLabel}
              actions={
                <>
                  {weekOffset !== 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)}>This week</Button>
                  )}
                  <button onClick={() => setWeekOffset((w) => w - 1)} className={iconButtonClass()} aria-label="Previous week">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button onClick={() => setWeekOffset((w) => w + 1)} disabled={weekOffset >= 0} className={iconButtonClass()} aria-label="Next week">
                    <ChevronRight className="size-4" />
                  </button>
                </>
              }
            />

            {/* Grid scrolls horizontally on narrow screens so columns stay tappable */}
            <div className="overflow-x-auto no-scrollbar">
              <div className="min-w-[520px]">
                <div className="grid items-end gap-2 border-b border-line px-4 py-2" style={{ gridTemplateColumns: gridColumns }}>
                  <div />
                  {weekDates.map((date, i) => {
                    const [y, m, d] = date.split("-").map(Number);
                    const isT = date === today;
                    return (
                      <div key={date} className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-medium text-subtle">{DAY_LABELS[i]}</span>
                        <span className={cn("text-xs font-semibold tabular-nums", isT ? "text-now" : "text-ink")}>
                          {new Date(y, m - 1, d).getDate()}
                        </span>
                      </div>
                    );
                  })}
                  <span className="text-center text-[10px] font-medium text-subtle">Streak</span>
                </div>

                <div className="divide-y divide-line">
                  {habits.map((habit) => {
                    const responsibility = responsibilities.find((r) => r.id === habit.responsibilityId);
                    const tone = responsibility ? getTone(responsibility.color) : null;
                    const streak = getStreak(habit, habitLogs);
                    const total = habit.type === "weekly" ? weeklyTotal(habit) : null;
                    const todayValue = logValue(habitLogs, habit.id, today);
                    const expanded = expandedId === habit.id;

                    return (
                      <div key={habit.id}>
                        <div className="group grid items-center gap-2 px-4 py-2.5" style={{ gridTemplateColumns: gridColumns }}>
                          <div className="flex min-w-0 items-center gap-1 pr-2">
                            <button onClick={() => setExpandedId(expanded ? null : habit.id)} className="flex min-w-0 flex-1 items-start gap-1.5 text-left">
                              <ChevronDown className={cn("mt-1 size-3.5 shrink-0 text-subtle transition-transform", !expanded && "-rotate-90")} />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-ink">{habit.title}</span>
                                <span className="flex items-center gap-1.5 text-xs text-muted">
                                  {tone && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />}
                                  {habit.type === "avoid" ? "Avoid" : habit.type === "limit" ? `≤ ${habit.target}/day` : habit.type === "weekly" ? `${habit.target}× a week` : habit.target === 1 ? "Daily" : `${habit.target}× a day`}
                                  {habit.unit ? ` · ${habit.unit}` : ""}
                                </span>
                              </span>
                            </button>
                            <button
                              onClick={() => startEdit(habit)}
                              aria-label={`Edit ${habit.title}`}
                              className={iconButtonClass("size-7 transition-opacity lg:opacity-0 lg:group-hover:opacity-100")}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>

                          {weekDates.map((date) => {
                            const value = logValue(habitLogs, habit.id, date);
                            const isFuture = date > today;
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
                                    className="h-8 w-11 rounded-lg border border-ink/25 bg-panel text-center text-xs text-ink outline-none"
                                  />
                                ) : (
                                  <HabitCell
                                    habit={habit}
                                    value={value}
                                    isFuture={isFuture}
                                    isToday={date === today}
                                    onClick={() => handleCellClick(habit, date)}
                                  />
                                )}
                              </div>
                            );
                          })}

                          <div className="flex items-center justify-center gap-1 text-center">
                            {habit.type === "weekly" ? (
                              <span className={cn("text-sm font-semibold tabular-nums", total! >= habit.target ? "text-success" : "text-ink")}>
                                {total}/{habit.target}
                              </span>
                            ) : habit.type === "limit" ? (
                              <span className={cn("text-sm font-semibold tabular-nums", todayValue > habit.target ? "text-danger" : "text-ink")}>
                                {todayValue}/{habit.target}
                              </span>
                            ) : (
                              <>
                                {streak > 0 && <Flame className="size-3.5 text-warning" />}
                                <span className={cn("text-sm font-semibold tabular-nums", streak > 0 ? "text-ink" : "text-subtle")}>{streak}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t border-line bg-paper/60 px-4 py-4 pl-10">
                            <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
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
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                                    {statItems.map(([label, value]) => (
                                      <div key={label}>
                                        <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
                                        <p className="text-xs text-muted">{label}</p>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              <div className="ml-auto">
                                <p className="mb-1.5 text-xs text-muted">Last 13 weeks</p>
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
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
