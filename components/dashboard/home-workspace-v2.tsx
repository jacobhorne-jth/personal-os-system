"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Inbox, Plus, Search, X } from "lucide-react";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { addDays, formatDateHeading, localDateKey } from "@/lib/dates";
import {
  activeReviewItems,
  dateFromKey,
  habitProgressForDate,
  tasksForDay,
  weekBounds,
} from "@/lib/dashboard/summary";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import { cn } from "@/lib/utils";

function weekStripDays(dateKey: string) {
  const { keys } = weekBounds(dateKey);
  return keys.map((key) => {
    const date = dateFromKey(key);
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      day: date.getDate(),
    };
  });
}

function SectionHeader({ title, href, action, count }: { title: string; href?: string; action?: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        {count !== undefined && (
          <span className="grid min-w-6 place-items-center rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-muted">
            {count}
          </span>
        )}
      </div>
      {href && action && (
        <Link href={href} className="shrink-0 text-xs font-semibold text-blue transition hover:brightness-110">
          {action}
        </Link>
      )}
    </div>
  );
}

export function HomeWorkspaceV2() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  const habits = useAppStore((state) => state.habits);
  const habitLogs = useAppStore((state) => state.habitLogs);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const logHabit = useAppStore((state) => state.logHabit);
  const { selectedDate, setSelectedDate } = useUiStore();
  const [captureOpen, setCaptureOpen] = useState(false);

  const today = localDateKey();
  const selectedIsToday = selectedDate === today;
  const dateLabel = formatDateHeading(dateFromKey(selectedDate));
  const weekDays = weekStripDays(selectedDate);
  const dayTasks = useMemo(() => tasksForDay(tasks, selectedDate), [tasks, selectedDate]);
  const activeReviews = useMemo(() => activeReviewItems(aiReviewItems), [aiReviewItems]);
  const habitProgress = useMemo(() => habitProgressForDate(habits, habitLogs, selectedDate), [habits, habitLogs, selectedDate]);
  const incompleteHabits = habitProgress.rows.filter((row) => !row.complete).length;

  return (
    <div className="h-full overflow-y-auto bg-paper text-ink">
      <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-3 px-4 pb-28 pt-3 sm:px-6 lg:px-8 lg:py-4">
        <section className="rounded-xl border border-line bg-panel p-3 shadow-glow">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">{selectedIsToday ? "Today" : "Selected day"}</p>
              <h1 className="mt-0.5 text-2xl font-semibold leading-tight text-ink sm:text-3xl">{dateLabel}</h1>
            </div>

            <div className="flex flex-col gap-2 lg:w-[460px]">
              <button
                type="button"
                onClick={() => setCaptureOpen((open) => !open)}
                className="flex h-10 items-center gap-3 rounded-xl border border-line bg-paper px-3 text-left text-muted transition hover:bg-hover hover:text-ink"
              >
                {captureOpen ? <X className="size-5" /> : <Search className="size-5" />}
                <span className="min-w-0 flex-1 truncate">{captureOpen ? "Close capture" : "Search or capture anything..."}</span>
                {!captureOpen && <Plus className="size-5 text-blue" />}
              </button>
              {captureOpen && (
                <QuickCaptureForm
                  autoFocus
                  dueAt={`${selectedDate}T17:00:00`}
                  placeholder="Task, note, event, or reminder"
                  onComplete={() => setCaptureOpen(false)}
                  onCancel={() => setCaptureOpen(false)}
                  inputClassName="border-line bg-paper text-ink"
                  selectClassName="border-line bg-paper text-ink"
                  dateClassName="border-line bg-paper text-ink"
                  descriptionClassName="border-line bg-paper text-ink placeholder:text-muted"
                />
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-paper"
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {dateFromKey(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-paper"
                aria-label="Next week"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const active = day.key === selectedDate;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(day.key)}
                    className={cn(
                      "grid h-11 place-items-center rounded-lg text-center transition sm:h-12",
                      active ? "bg-blue text-white shadow-lift" : "bg-paper text-ink hover:bg-hover"
                    )}
                  >
                    <span className={cn("text-[10px] font-semibold uppercase", active ? "text-white/80" : "text-muted")}>{day.label}</span>
                    <span className="text-base font-semibold">{day.day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px_360px]">
          <DayTimeline date={selectedDate} className="min-h-[620px] xl:col-start-1 xl:row-start-1" />

          <div className="rounded-xl border border-line bg-panel p-4 shadow-glow xl:col-start-2 xl:row-start-1">
            <SectionHeader title={selectedIsToday ? "Today's tasks" : "Selected day's tasks"} href="/tasks" action="See all" count={dayTasks.length} />
            {dayTasks.length ? (
              <div className="divide-y divide-line">
                {dayTasks.slice(0, 8).map((task) => {
                  const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
                  const color = taskLabelColor(label, responsibilities);
                  return (
                    <div key={task.id} className="flex items-start gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition active:scale-95"
                        style={{ borderColor: color }}
                        aria-label="Complete task"
                      />
                      <Link href={`/task/${task.id}`} className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{task.title}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </p>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-paper px-4 py-6 text-center text-sm text-muted">No tasks for this day.</div>
            )}
          </div>

          <aside className="space-y-4 xl:col-start-3 xl:row-start-1">
            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <SectionHeader title="Inbox review" href="/inbox" action="Open inbox" count={activeReviews.length} />
              {activeReviews.length ? (
                <div className="space-y-2">
                  {activeReviews.slice(0, 4).map((item) => (
                    <Link key={item.id} href="/inbox" className="flex items-center gap-3 rounded-lg bg-paper px-3 py-3 transition hover:bg-hover">
                      <Inbox className="size-4 shrink-0 text-blue" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{item.summary}</p>
                        <p className="text-xs text-muted">{Math.round(item.confidence * 100)}% confidence</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-paper px-4 py-4 text-sm text-muted">No reviews waiting.</p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <SectionHeader title="Habits" href="/habits" action="Track" count={incompleteHabits} />
              {habitProgress.rows.length ? (
                <div className="space-y-2">
                  {habitProgress.rows.slice(0, 6).map(({ habit, value, complete }) => (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => logHabit(habit.id, selectedDate, complete ? 0 : Math.max(1, habit.target))}
                      className="flex w-full items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-left transition hover:bg-hover"
                    >
                      <span className="min-w-0 truncate text-sm text-ink">{habit.title}</span>
                      <span className={cn("grid size-5 place-items-center rounded-full border", complete ? "border-mint bg-mint text-white" : "border-line text-muted")}>
                        {complete && <CheckCircle2 className="size-3.5" />}
                      </span>
                      <span className="sr-only">{value}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-paper px-4 py-4 text-sm text-muted">No habits configured.</p>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
