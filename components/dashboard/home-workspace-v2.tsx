"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CheckSquare2, ChevronLeft, ChevronRight, Dumbbell, Flame, Inbox, Plus, Search, Utensils, X } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { addDays, formatDateHeading, localDateKey } from "@/lib/dates";
import {
  activeReviewItems,
  dateFromKey,
  eventsForDay,
  foodTotalsForDate,
  goalProgress,
  habitProgressForDate,
  tasksForDay,
  taskStatsForWeek,
  weekBounds,
} from "@/lib/dashboard/summary";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import { cn } from "@/lib/utils";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

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

function StatTile({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
        <Icon className="size-4 text-muted" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function SectionHeader({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {href && action && (
        <Link href={href} className="text-xs font-semibold text-blue transition hover:brightness-110">
          {action}
        </Link>
      )}
    </div>
  );
}

export function HomeWorkspaceV2() {
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  const habits = useAppStore((state) => state.habits);
  const habitLogs = useAppStore((state) => state.habitLogs);
  const foodEntries = useAppStore((state) => state.foodEntries);
  const foodTargets = useAppStore((state) => state.foodTargets);
  const gymSessions = useAppStore((state) => state.gymSessions);
  const goals = useAppStore((state) => state.goals);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const logHabit = useAppStore((state) => state.logHabit);
  const { selectedDate, setSelectedDate, setCalendarView, setCalendarGotoDate } = useUiStore();
  const [captureOpen, setCaptureOpen] = useState(false);

  const today = localDateKey();
  const selectedIsToday = selectedDate === today;
  const dateLabel = formatDateHeading(dateFromKey(selectedDate));
  const weekDays = weekStripDays(selectedDate);
  const schedule = useMemo(() => eventsForDay(calendarItems, selectedDate), [calendarItems, selectedDate]);
  const dayTasks = useMemo(() => tasksForDay(tasks, selectedDate), [tasks, selectedDate]);
  const activeReviews = useMemo(() => activeReviewItems(aiReviewItems), [aiReviewItems]);
  const habitProgress = useMemo(() => habitProgressForDate(habits, habitLogs, selectedDate), [habits, habitLogs, selectedDate]);
  const foodTotals = useMemo(() => foodTotalsForDate(foodEntries, selectedDate), [foodEntries, selectedDate]);
  const weeklyTasks = useMemo(() => taskStatsForWeek(tasks, selectedDate), [tasks, selectedDate]);
  const goalsProgress = useMemo(() => goalProgress(goals), [goals]);
  const workoutLogged = gymSessions.some((session) => session.date === selectedDate);
  const completedForDate = tasks.filter((task) => task.status === "done" && task.dueAt?.slice(0, 10) === selectedDate).length;
  const briefingItems = [
    schedule[0] && {
      label: "Next event",
      title: `${formatTime(schedule[0].startsAt)} · ${schedule[0].title}`,
      href: "/calendar",
      onClick: openSelectedDay,
    },
    dayTasks[0] && {
      label: "First task",
      title: dayTasks[0].title,
      href: `/task/${dayTasks[0].id}`,
    },
    activeReviews[0] && {
      label: "Inbox",
      title: `${activeReviews.length} review item${activeReviews.length === 1 ? "" : "s"} waiting`,
      href: "/inbox",
    },
    !workoutLogged && {
      label: "Body",
      title: "Workout not logged",
      href: "/gym",
    },
  ].filter(Boolean) as Array<{ label: string; title: string; href: string; onClick?: () => void }>;

  function openSelectedDay() {
    setCalendarView("day");
    setCalendarGotoDate(`${selectedDate}T12:00:00`);
  }

  return (
    <div className="h-full overflow-y-auto bg-paper text-ink">
      <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-4 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:py-6">
        <section className="rounded-xl border border-line bg-panel p-4 shadow-glow sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted">{selectedIsToday ? "Today" : "Selected day"}</p>
              <h1 className="mt-1 text-3xl font-semibold leading-tight text-ink sm:text-4xl">{dateLabel}</h1>
              <p className="mt-2 text-sm text-muted">
                {schedule.length} event{schedule.length === 1 ? "" : "s"} · {dayTasks.length} task{dayTasks.length === 1 ? "" : "s"} · {activeReviews.length} inbox review{activeReviews.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:w-[520px]">
              <button
                type="button"
                onClick={() => setCaptureOpen((open) => !open)}
                className="flex h-12 items-center gap-3 rounded-xl border border-line bg-paper px-4 text-left text-muted transition hover:bg-hover hover:text-ink"
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

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-paper"
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
                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-paper"
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
                      "grid h-16 place-items-center rounded-lg text-center transition",
                      active ? "bg-blue text-white shadow-lift" : "bg-paper text-ink hover:bg-hover"
                    )}
                  >
                    <span className={cn("text-[11px] font-semibold uppercase", active ? "text-white/80" : "text-muted")}>{day.label}</span>
                    <span className="text-lg font-semibold">{day.day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Tasks" value={`${completedForDate}/${completedForDate + dayTasks.length}`} detail={`${weeklyTasks.overdue} overdue this week`} icon={CheckSquare2} />
          <StatTile label="Habits" value={`${habitProgress.completed}/${habitProgress.total}`} detail={habitProgress.total ? "scheduled today" : "none set up"} icon={Flame} />
          <StatTile label="Calories" value={`${foodTotals.calories}/${foodTargets.calories}`} detail={`${foodTotals.protein}/${foodTargets.protein}g protein`} icon={Utensils} />
          <StatTile label="Workout" value={workoutLogged ? "Logged" : "Not logged"} detail={goalsProgress.average !== null ? `${goalsProgress.average}% avg goal progress` : "no active goals"} icon={Dumbbell} />
        </section>

        <section className="grid gap-3 lg:grid-cols-4">
          {briefingItems.slice(0, 4).map((item) => (
            <Link
              key={`${item.label}-${item.title}`}
              href={item.href}
              onClick={item.onClick}
              className="rounded-xl border border-line bg-panel p-4 shadow-glow transition hover:border-blue/40 hover:bg-hover"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{item.label}</p>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-ink">{item.title}</p>
            </Link>
          ))}
          {briefingItems.length === 0 && (
            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Daily briefing</p>
              <p className="mt-2 text-sm text-muted">Nothing urgent is waiting. Pick one meaningful thing and protect the time.</p>
            </div>
          )}
        </section>

        <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <SectionHeader title="Today's schedule" href="/calendar" action="View day" />
              {schedule.length ? (
                <div className="divide-y divide-line">
                  {schedule.slice(0, 5).map((item) => (
                    <Link key={item.id} href="/calendar" onClick={openSelectedDay} className="grid grid-cols-[78px_1fr] gap-3 py-3 transition hover:text-blue">
                      <span className="text-sm font-semibold text-blue">{formatTime(item.startsAt)}</span>
                      <span className="min-w-0 truncate text-sm font-medium text-ink">{item.title}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href="/calendar" onClick={openSelectedDay} className="flex items-center justify-between rounded-lg bg-paper px-4 py-3 text-sm text-muted transition hover:bg-hover">
                  No events on this day
                  <ChevronRight className="size-4" />
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <SectionHeader title="Tasks" href="/tasks" action="See all" />
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
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <SectionHeader title="Inbox review" href="/inbox" action="Open inbox" />
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
              <SectionHeader title="Habits" href="/habits" action="Track" />
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

            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <SectionHeader title="Focus next" href="/progress" action="Weekly review" />
              <p className="text-sm leading-6 text-muted">
                {dayTasks[0]
                  ? `Start with "${dayTasks[0].title}" before the day fills up.`
                  : activeReviews.length
                    ? "Clear the inbox review queue before adding more work."
                    : "The day looks open. Pick one important thing and protect time for it."}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
