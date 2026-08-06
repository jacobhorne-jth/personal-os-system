"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CheckSquare2, ChevronLeft, ChevronRight, GripVertical, Plus, Search, Video, X } from "lucide-react";
import { FullCalendarBoard } from "@/components/calendar/full-calendar-board";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { addDays, localDateKey, formatDateHeading } from "@/lib/dates";
import { expandCalendarItems } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import type { CalendarItem } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const dateFilters = ["Today", "All"] as const;

function taskDate(taskDate?: string) {
  return taskDate?.slice(0, 10);
}

function matchesDate(filter: (typeof dateFilters)[number], today: string, dueAt?: string) {
  const due = taskDate(dueAt);
  if (filter === "All") return true;
  // "Today" includes overdue — they're still today's reality
  return due !== undefined && due <= today;
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function longDateHeading(dateKey: string) {
  return dateFromKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function weekStripDays(dateKey: string) {
  const selected = dateFromKey(dateKey);
  const monday = new Date(selected);
  const day = selected.getDay();
  monday.setDate(selected.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: localDateKey(date),
      dayNumber: date.getDate(),
      dayLabel: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
    };
  });
}

function dayBounds(dateKey: string) {
  const start = dateFromKey(dateKey);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

function isScheduleItem(item: CalendarItem) {
  return item.type !== "task_due" && item.type !== "time_log";
}

function formatScheduleTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function MobileHome() {
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const { selectedDate, setSelectedDate, setCalendarView, setCalendarGotoDate } = useUiStore();
  const [addOpen, setAddOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const today = localDateKey();
  const selectedIsToday = selectedDate === today;
  const weekDays = weekStripDays(selectedDate);
  const { start, end } = dayBounds(selectedDate);
  const scheduleItems = expandCalendarItems(calendarItems, start, end)
    .filter((item) => isScheduleItem(item) && localDateKey(new Date(item.startsAt)) === selectedDate)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const openTasks = tasks.filter((task) => task.status !== "done");
  const selectedTasks = openTasks
    .filter((task) => {
      const due = taskDate(task.dueAt);
      if (!due) return false;
      return selectedIsToday ? due <= selectedDate : due === selectedDate;
    })
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  const completedToday = tasks.filter((task) => task.status === "done" && taskDate(task.dueAt) === selectedDate).length;

  function openSelectedDay() {
    setCalendarView("day");
    setCalendarGotoDate(`${selectedDate}T12:00:00`);
  }

  function addEventHref() {
    return `/calendar?start=${encodeURIComponent(`${selectedDate}T09:00:00`)}&end=${encodeURIComponent(`${selectedDate}T10:00:00`)}`;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink lg:hidden">
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight text-ink">{longDateHeading(selectedDate)}</h1>
            <p className="mt-1 text-sm text-muted">
              {scheduleItems.length} {scheduleItems.length === 1 ? "meeting" : "meetings"} · {selectedTasks.length} {selectedTasks.length === 1 ? "task" : "tasks"} remaining
            </p>
            <p className="mt-1 text-xs text-muted/70">{completedToday} completed</p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAddOpen((open) => !open)}
              aria-label="Add task or event"
              className="grid size-12 place-items-center rounded-full bg-blue text-white shadow-[0_14px_30px_rgba(66,133,244,0.32)] transition active:scale-95"
            >
              {addOpen ? <X className="size-5" /> : <Plus className="size-6" />}
            </button>
            {addOpen && (
              <div className="absolute right-0 top-14 z-20 w-44 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-glow">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddOpen(true);
                    setAddOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-paper"
                >
                  <CheckSquare2 className="size-4 text-[#109855]" />
                  Add task
                </button>
                <Link
                  href={addEventHref()}
                  onClick={() => {
                    setAddOpen(false);
                    setCalendarView("day");
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ink transition hover:bg-paper"
                >
                  <CalendarDays className="size-4 text-blue" />
                  Add event
                </Link>
              </div>
            )}
          </div>
        </header>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              aria-label="Previous week"
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-panel"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-xs font-semibold uppercase text-muted">
              {dateFromKey(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              aria-label="Next week"
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-panel"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const selected = day.key === selectedDate;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDate(day.key)}
                  className={cn(
                    "grid h-16 place-items-center rounded-lg text-center transition",
                    selected ? "bg-blue text-white shadow-lift" : "text-ink hover:bg-panel"
                  )}
                >
                  <span className={cn("text-[11px] font-semibold uppercase", selected ? "text-white/80" : "text-muted")}>{day.dayLabel}</span>
                  <span className="text-lg font-semibold">{day.dayNumber}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-line bg-panel shadow-glow">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue">
              <CalendarDays className="size-4" />
              Today's Schedule
            </div>
            <Link
              href="/calendar"
              onClick={openSelectedDay}
              className="flex items-center gap-1 text-xs font-semibold text-blue"
            >
              View day
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {scheduleItems.length > 0 ? (
            <div className="divide-y divide-line px-4">
              {scheduleItems.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/event/${item.id}`} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 py-3">
                  <span className="text-sm font-medium text-blue">{formatScheduleTime(item.startsAt)}</span>
                  <span className="min-w-0 truncate text-sm font-medium text-ink">{item.title}</span>
                  <Video className="size-4 text-muted" />
                </Link>
              ))}
              {scheduleItems.length > 3 && (
                <Link href="/calendar" onClick={openSelectedDay} className="block py-3 text-center text-xs font-semibold text-blue">
                  {scheduleItems.length - 3} more
                </Link>
              )}
            </div>
          ) : (
            <Link href="/calendar" onClick={openSelectedDay} className="flex items-center justify-between px-4 py-3 text-sm text-muted">
              <span>No events today</span>
              <span className="font-semibold text-blue">View calendar</span>
            </Link>
          )}
        </section>

        <section className="rounded-lg border border-line bg-panel shadow-glow">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#109855]">
              <CheckSquare2 className="size-4" />
              Tasks
            </div>
            <Link href="/tasks" className="flex items-center gap-1 text-xs font-semibold text-[#109855]">
              See all
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {quickAddOpen && (
            <div className="border-b border-line p-3">
              <QuickCaptureForm
                autoFocus
                dueAt={`${selectedDate}T17:00:00`}
                placeholder="Add a task"
                onComplete={() => setQuickAddOpen(false)}
                inputClassName="border-line bg-paper"
                selectClassName="border-line bg-paper"
                dateClassName="border-line bg-paper"
                descriptionClassName="border-line bg-paper"
              />
            </div>
          )}
          {selectedTasks.length > 0 ? (
            <div className="divide-y divide-line px-4">
              {selectedTasks.slice(0, 8).map((task) => {
                const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
                const color = taskLabelColor(label, responsibilities);
                return (
                  <div key={task.id} className="flex items-start gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      aria-label="Complete task"
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[4px] border-[1.5px] bg-panel transition active:scale-95"
                      style={{ borderColor: `${color}99` }}
                    />
                    <Link href={`/task/${task.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{task.title}</p>
                      {task.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{task.description}</p>}
                    </Link>
                    <GripVertical className="mt-0.5 size-4 shrink-0 text-muted/50" />
                  </div>
                );
              })}
              {selectedTasks.length > 8 && (
                <Link href="/tasks" className="block py-3 text-center text-xs font-semibold text-[#109855]">
                  {selectedTasks.length - 8} more tasks
                </Link>
              )}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted">No tasks for this day.</div>
          )}
        </section>
      </main>
    </div>
  );
}

export function HomeWorkspaceV2() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const selectedDate = useUiStore((state) => state.selectedDate);
  const [addingTask, setAddingTask] = useState(false);

  const openTasks = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  const selectedDateLabel = dateFromKey(selectedDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="grid h-dvh min-h-0 grid-rows-[minmax(320px,46dvh)_minmax(0,1fr)] overflow-hidden bg-paper text-ink lg:h-full lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1">
      <main className="min-h-0 min-w-0 border-b border-line lg:border-b-0 lg:border-r">
        <FullCalendarBoard homeMode />
      </main>

      <aside className="flex min-h-0 flex-col bg-panel [--panel-inset:20px]">
        <div className="shrink-0 border-b border-line px-[var(--panel-inset)] py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink">Todo list</p>
              <p className="mt-0.5 text-xs text-muted">{selectedDateLabel} · {openTasks.length} open</p>
            </div>
            <button
              type="button"
              onClick={() => setAddingTask((open) => !open)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition",
                addingTask ? "border-line bg-paper text-ink hover:bg-hover" : "border-blue bg-blue text-white shadow-lift hover:brightness-110"
              )}
            >
              {addingTask ? <X className="size-4" /> : <Plus className="size-4" />}
              {addingTask ? "Close" : "Add task"}
            </button>
          </div>
        </div>

        {addingTask && (
          <div className="shrink-0 border-b border-line p-[var(--panel-inset)]">
            <QuickCaptureForm
              autoFocus
              stackControls
              dueAt={`${selectedDate}T17:00:00`}
              placeholder="Task name"
              onComplete={() => setAddingTask(false)}
              onCancel={() => setAddingTask(false)}
              inputClassName="border-line bg-paper text-ink [&_input]:text-ink [&_input::placeholder]:text-muted [&_svg]:text-muted"
              selectClassName="border-line bg-panel text-muted"
              dateClassName="border-line bg-panel text-muted"
              descriptionClassName="border-line bg-panel text-ink placeholder:text-muted"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pb-28 lg:pb-3">
          {openTasks.length === 0 ? (
            <p className="p-[var(--panel-inset)] text-sm text-muted">No open tasks.</p>
          ) : (
            <div className="divide-y divide-line">
              {openTasks.map((task) => {
                const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
                const labelColor = taskLabelColor(label, responsibilities);
                return (
                  <div key={task.id} className="flex items-start gap-3 px-[var(--panel-inset)] py-3 transition hover:bg-paper">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.status === "done" ? "Reopen task" : "Complete task"}
                      className={cn("mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full border-[1.5px] transition hover:opacity-60", task.status === "done" && "bg-mint")}
                      style={{ borderColor: task.status === "done" ? "#34a853" : labelColor }}
                    >
                      {task.status === "done" && <CheckCircle2 className="size-3 text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{task.title}</p>
                      {task.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{task.description}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: labelColor }} />
                          {label}
                        </span>
                        {task.dueAt && (
                          <span className={cn(taskDate(task.dueAt)! < localDateKey() && "font-medium text-[#cf4444]")}>
                            {taskDate(task.dueAt)! < localDateKey() ? "Overdue · " : ""}
                            {new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
