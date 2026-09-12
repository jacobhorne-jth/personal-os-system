"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Inbox, X } from "lucide-react";
import { DayTimeline, isAllDayItem, useNowMinutes } from "@/components/calendar/day-timeline";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { TaskRow } from "@/components/tasks/task-row";
import { Card, CardHeader, EmptyState, iconButtonClass } from "@/components/ui/primitives";
import { addDays, dateFromKey, dateKeyOf, localDateKey } from "@/lib/dates";
import { activeReviewItems, habitProgressForDate, taskDate, tasksForDay, weekBounds } from "@/lib/dashboard/summary";
import { expandCalendarItems } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTone } from "@/lib/theme";
import type { CalendarItem, Habit } from "@/lib/types/domain";
import { cn, formatTime } from "@/lib/utils";

function relativeDayLabel(dateKey: string, today: string) {
  const diff = Math.round((dateFromKey(dateKey).getTime() - dateFromKey(today).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

// ─── Header ───────────────────────────────────────────────────────────────────

function DayHeader({ selectedDate, today, onSelect, eventColorsByDay }: {
  selectedDate: string;
  today: string;
  onSelect: (dateKey: string) => void;
  eventColorsByDay: Map<string, string[]>;
}) {
  const date = dateFromKey(selectedDate);
  const { keys } = weekBounds(selectedDate);

  return (
    <header className="shrink-0 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("text-[13px] font-medium", selectedDate === today ? "text-now" : "text-muted")}>
            {relativeDayLabel(selectedDate, today)}
          </p>
          <h1 className="mt-0.5 truncate text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {date.toLocaleDateString("en-US", { weekday: "long" })}
            <span className="font-normal text-muted sm:hidden"> {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <span className="hidden font-normal text-muted sm:inline"> {date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onSelect(addDays(selectedDate, -1))} className={iconButtonClass()} aria-label="Previous day" title="Previous day (←)">
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelect(today)}
            disabled={selectedDate === today}
            className="h-8 rounded-lg border border-line bg-panel px-3 text-[13px] font-medium text-ink transition-colors hover:bg-hover disabled:opacity-40"
            title="Jump to today (T)"
          >
            Today
          </button>
          <button type="button" onClick={() => onSelect(addDays(selectedDate, 1))} className={iconButtonClass()} aria-label="Next day" title="Next day (→)">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 lg:max-w-[560px]">
        {keys.map((key) => {
          const day = dateFromKey(key);
          const active = key === selectedDate;
          const isToday = key === today;
          const colors = eventColorsByDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={active}
              aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              className={cn(
                "flex h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                active ? "bg-ink text-paper" : "hover:bg-hover"
              )}
            >
              <span className={cn("text-[11px] font-medium", active ? "text-paper/70" : "text-subtle")}>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className={cn("text-[15px] font-semibold tabular-nums leading-none", !active && isToday && "text-now", !active && !isToday && "text-ink")}>
                {day.getDate()}
              </span>
              <span className="mt-0.5 flex h-1.5 items-center gap-[3px]">
                {colors.slice(0, 3).map((color, index) => (
                  <span key={index} className="size-1 rounded-full" style={{ backgroundColor: active ? "rgb(var(--color-paper))" : color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

// ─── Schedule (phone): agenda list instead of a scrolling grid ───────────────

function Agenda({ items, isToday }: { items: CalendarItem[]; isToday: boolean }) {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const nowMinutes = useNowMinutes();
  if (!items.length) {
    return <EmptyState title="Nothing scheduled" description="Tap + to add a task, or open the calendar to block time." className="py-8" />;
  }
  return (
    <div className="divide-y divide-line">
      {items.map((item) => {
        const color = getTone(responsibilities.find((entry) => entry.id === item.responsibilityId)?.color ?? "blue").hex;
        const end = new Date(item.endsAt);
        const past = isToday && end.getHours() * 60 + end.getMinutes() <= nowMinutes && dateKeyOf(item.endsAt) === localDateKey();
        const allDay = isAllDayItem(item);
        return (
          <Link key={item.id} href={`/event/${item.id}`} className={cn("flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-hover/50", past && "opacity-50")}>
            <div className="w-[66px] shrink-0 whitespace-nowrap text-right text-xs tabular-nums leading-5">
              {allDay ? (
                <span className="text-muted">All day</span>
              ) : (
                <>
                  <p className="font-medium text-ink">{formatTime(item.startsAt)}</p>
                  <p className="text-subtle">{formatTime(item.endsAt)}</p>
                </>
              )}
            </div>
            <span className="w-[3px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-5 text-ink">{item.title || "Untitled"}</p>
              {item.location && <p className="truncate text-xs text-muted">{item.location}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Habits ───────────────────────────────────────────────────────────────────

function HabitToggle({ habit, value, complete, weekTotal, onLog }: {
  habit: Habit;
  value: number;
  complete: boolean;
  weekTotal: number;
  onLog: (value: number) => void;
}) {
  const counting = habit.type === "daily" && habit.target > 1;
  const failed = habit.type === "avoid" && value === 1;
  const progress = habit.type === "weekly"
    ? Math.min(1, weekTotal / Math.max(1, habit.target))
    : counting
      ? Math.min(1, value / habit.target)
      : complete ? 1 : 0;
  const R = 9;
  const C = 2 * Math.PI * R;

  function handleClick() {
    if (habit.type === "avoid" || habit.type === "weekly" || habit.target === 1) {
      onLog(value >= 1 ? 0 : 1);
    } else if (habit.type === "limit") {
      onLog(value + 1);
    } else {
      onLog(Math.min(999, value + 1));
    }
  }

  const detail =
    habit.type === "weekly" ? `${weekTotal}/${habit.target} this week`
    : habit.type === "avoid" ? (failed ? "Slipped today" : "Clean so far")
    : habit.type === "limit" ? `${value}/${habit.target} max`
    : counting ? `${value}/${habit.target}${habit.unit ? ` ${habit.unit}` : ""}`
    : complete ? "Done" : "Not yet";

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-5 text-ink">{habit.title}</p>
        <p className={cn("text-xs", failed ? "text-danger" : "text-muted")}>{detail}</p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={(event) => {
          if (!counting) return;
          event.preventDefault();
          onLog(0);
        }}
        aria-label={`Log ${habit.title}`}
        title={counting ? "Click to count · right-click to reset" : undefined}
        className="relative grid size-8 shrink-0 place-items-center rounded-full transition-transform hover:bg-hover active:scale-90"
      >
        <svg viewBox="0 0 24 24" className="absolute inset-1 -rotate-90">
          <circle cx="12" cy="12" r={R} fill="none" stroke="rgb(var(--color-line))" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r={R}
            fill="none"
            stroke={failed ? "rgb(var(--color-danger))" : "rgb(var(--color-success))"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - (failed ? 1 : progress))}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        {failed ? (
          <X className="relative size-3 text-danger" strokeWidth={3} />
        ) : complete ? (
          <Check className="relative size-3 text-success" strokeWidth={3} />
        ) : null}
      </button>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export function HomeWorkspaceV2() {
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  const habits = useAppStore((state) => state.habits);
  const habitLogs = useAppStore((state) => state.habitLogs);
  const logHabit = useAppStore((state) => state.logHabit);
  const { selectedDate, setSelectedDate } = useUiStore();
  const [showCompleted, setShowCompleted] = useState(false);

  const today = localDateKey();
  const isToday = selectedDate === today;

  // ← / → move a day, T jumps to today
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const current = useUiStore.getState().selectedDate;
      if (event.key === "ArrowLeft") setSelectedDate(addDays(current, -1));
      else if (event.key === "ArrowRight") setSelectedDate(addDays(current, 1));
      else if (event.key.toLowerCase() === "t") setSelectedDate(localDateKey());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelectedDate]);

  const colorFor = (responsibilityId: string) =>
    getTone(responsibilities.find((entry) => entry.id === responsibilityId)?.color ?? "blue").hex;

  const eventColorsByDay = useMemo(() => {
    const { start, end } = weekBounds(selectedDate);
    const map = new Map<string, string[]>();
    for (const item of expandCalendarItems(calendarItems, start, end)) {
      if (item.type === "task_due" || item.type === "time_log") continue;
      const key = dateKeyOf(item.startsAt);
      const colors = map.get(key) ?? [];
      const color = getTone(responsibilities.find((entry) => entry.id === item.responsibilityId)?.color ?? "blue").hex;
      if (!colors.includes(color)) colors.push(color);
      map.set(key, colors);
    }
    return map;
  }, [calendarItems, responsibilities, selectedDate]);

  const dayItems = useMemo(() => {
    const start = dateFromKey(selectedDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return expandCalendarItems(calendarItems, start, end)
      .filter((item) => item.type !== "task_due" && new Date(item.startsAt) < end && new Date(item.endsAt) > start)
      .sort((a, b) => Number(isAllDayItem(b)) - Number(isAllDayItem(a)) || a.startsAt.localeCompare(b.startsAt));
  }, [calendarItems, selectedDate]);

  const scheduledMinutes = dayItems
    .filter((item) => !isAllDayItem(item) && item.type !== "time_log")
    .reduce((sum, item) => sum + Math.max(0, (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60000), 0);
  const eventCount = dayItems.filter((item) => item.type !== "time_log").length;

  const openTasks = useMemo(() => tasksForDay(tasks, selectedDate), [tasks, selectedDate]);
  const overdueTasks = isToday ? openTasks.filter((task) => taskDate(task)! < today) : [];
  const dueTasks = isToday ? openTasks.filter((task) => taskDate(task)! >= today) : openTasks;
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "done" && taskDate(task) === selectedDate),
    [tasks, selectedDate]
  );

  const activeReviews = useMemo(() => activeReviewItems(aiReviewItems), [aiReviewItems]);
  const habitProgress = useMemo(() => habitProgressForDate(habits, habitLogs, selectedDate), [habits, habitLogs, selectedDate]);
  const weekKeys = weekBounds(selectedDate).keys;
  const weekTotal = (habitId: string) =>
    habitLogs.filter((log) => log.habitId === habitId && weekKeys.includes(log.date)).reduce((sum, log) => sum + log.value, 0);

  const selectedLabel = dateFromKey(selectedDate).toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-paper lg:overflow-hidden">
      <DayHeader selectedDate={selectedDate} today={today} onSelect={setSelectedDate} eventColorsByDay={eventColorsByDay} />

      <div className="grid gap-4 px-4 pb-28 pt-5 sm:px-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,410px)] lg:px-8 lg:pb-6 xl:gap-5">
        {/* Schedule */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader
            title="Schedule"
            meta={eventCount ? `${eventCount} ${eventCount === 1 ? "event" : "events"}${scheduledMinutes ? ` · ${formatDuration(Math.round(scheduledMinutes))}` : ""}` : undefined}
            actions={
              <Link href="/calendar" className={iconButtonClass()} title="Open calendar" aria-label="Open calendar">
                <ArrowUpRight className="size-4" />
              </Link>
            }
          />
          <div className="lg:hidden">
            <Agenda items={dayItems.filter((item) => item.type !== "time_log")} isToday={isToday} />
          </div>
          <DayTimeline date={selectedDate} allowCreate className="hidden min-h-0 flex-1 lg:flex" />
        </Card>

        {/* Tasks + secondary */}
        <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pb-1 no-scrollbar">
          <Card>
            <CardHeader
              title="Tasks"
              meta={openTasks.length ? `${openTasks.length} open` : undefined}
              actions={
                <Link href="/tasks" className={iconButtonClass()} title="All tasks" aria-label="All tasks">
                  <ArrowUpRight className="size-4" />
                </Link>
              }
            />
            <div className="px-3 pt-3">
              <QuickCaptureForm
                key={selectedDate}
                dueAt={`${selectedDate}T17:00:00`}
                placeholder={isToday ? "Add a task for today" : `Add a task for ${selectedLabel}`}
              />
            </div>

            <div className="py-2">
              {overdueTasks.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-2 text-xs font-medium text-danger">Overdue · {overdueTasks.length}</p>
                  {overdueTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                  {dueTasks.length > 0 && <p className="px-4 pb-1 pt-3 text-xs font-medium text-muted">Today</p>}
                </>
              )}
              {dueTasks.map((task) => (
                <TaskRow key={task.id} task={task} showDue={false} />
              ))}
              {openTasks.length === 0 && (
                <p className="px-4 py-6 text-center text-[13px] text-muted">
                  {completedTasks.length ? "All done. Nice." : isToday ? "Nothing due today." : `Nothing due ${selectedLabel}.`}
                </p>
              )}
            </div>

            {completedTasks.length > 0 && (
              <div className="border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCompleted((value) => !value)}
                  aria-expanded={showCompleted}
                  className="flex h-10 w-full items-center gap-2 px-4 text-xs font-medium text-muted transition-colors hover:text-ink"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", !showCompleted && "-rotate-90")} />
                  Completed · {completedTasks.length}
                </button>
                {showCompleted && (
                  <div className="pb-2">
                    {completedTasks.map((task) => (
                      <TaskRow key={task.id} task={task} showDue={false} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {activeReviews.length > 0 && (
            <Link
              href="/inbox"
              className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:bg-hover/50"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                <Inbox className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {activeReviews.length} {activeReviews.length === 1 ? "capture" : "captures"} to review
                </p>
                <p className="truncate text-xs text-muted">{activeReviews[0].summary}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-subtle" />
            </Link>
          )}

          {habitProgress.rows.length > 0 && (
            <Card>
              <CardHeader
                title="Habits"
                meta={`${habitProgress.completed}/${habitProgress.total}`}
                actions={
                  <Link href="/habits" className={iconButtonClass()} title="All habits" aria-label="All habits">
                    <ArrowUpRight className="size-4" />
                  </Link>
                }
              />
              <div className="py-1.5">
                {habitProgress.rows.map(({ habit, value, complete }) => (
                  <HabitToggle
                    key={habit.id}
                    habit={habit}
                    value={value}
                    complete={habit.type === "weekly" ? weekTotal(habit.id) >= habit.target : complete}
                    weekTotal={weekTotal(habit.id)}
                    onLog={(next) => logHabit(habit.id, selectedDate, next)}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Label legend keeps event colors decodable without the calendar */}
          {eventCount > 0 && (
            <div className="hidden flex-wrap gap-x-4 gap-y-1.5 px-1 lg:flex">
              {Array.from(new Set(dayItems.map((item) => item.responsibilityId))).map((id) => {
                const responsibility = responsibilities.find((entry) => entry.id === id);
                if (!responsibility) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 rounded-full" style={{ backgroundColor: colorFor(id) } as CSSProperties} />
                    {responsibility.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
