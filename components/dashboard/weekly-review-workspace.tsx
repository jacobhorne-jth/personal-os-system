"use client";

import Link from "next/link";
import { AlertCircle, CalendarDays, CheckSquare2, Dumbbell, Flame, Inbox, Target, Utensils } from "lucide-react";
import {
  activeReviewItems,
  dateKeyOf,
  foodTotalsForDate,
  goalProgress,
  gymSessionsForWeek,
  habitProgressForDate,
  scheduledHoursForWeek,
  taskDate,
  taskStatsForWeek,
  weekBounds,
} from "@/lib/dashboard/summary";
import { localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
        <Icon className="size-4 text-muted" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

export function WeeklyReviewWorkspace() {
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const habits = useAppStore((state) => state.habits);
  const habitLogs = useAppStore((state) => state.habitLogs);
  const gymSessions = useAppStore((state) => state.gymSessions);
  const foodEntries = useAppStore((state) => state.foodEntries);
  const foodTargets = useAppStore((state) => state.foodTargets);
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  const goals = useAppStore((state) => state.goals);

  const today = localDateKey();
  const { keys } = weekBounds(today);
  const taskStats = taskStatsForWeek(tasks, today);
  const reviewItems = activeReviewItems(aiReviewItems);
  const gymThisWeek = gymSessionsForWeek(gymSessions, today);
  const goalStats = goalProgress(goals);
  const scheduleHours = scheduledHoursForWeek(calendarItems, today);
  const completedTasks = tasks.filter((task) => task.status === "done" && task.dueAt && keys.includes(taskDate(task)!));
  const meetings = calendarItems.filter((item) => {
    const key = dateKeyOf(item.startsAt);
    return keys.includes(key) && item.type !== "task_due" && item.type !== "time_log";
  });
  const timeByLabel = responsibilities
    .map((responsibility) => {
      const hours = calendarItems
        .filter((item) => item.responsibilityId === responsibility.id && keys.includes(dateKeyOf(item.startsAt)) && item.type !== "task_due")
        .reduce((total, item) => total + Math.max(0, new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 3_600_000, 0);
      return { responsibility, hours };
    })
    .filter((row) => row.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const habitDays = keys.filter((key) => key <= today);
  const habitHits = habitDays.reduce((total, key) => total + habitProgressForDate(habits, habitLogs, key).completed, 0);
  const habitPossible = habitDays.length * habits.length;
  const habitRate = habitPossible ? Math.round((habitHits / habitPossible) * 100) : null;
  const foodDays = keys.map((key) => foodTotalsForDate(foodEntries, key)).filter((day) => day.calories > 0 || day.protein > 0);
  const avgCalories = foodDays.length ? Math.round(foodDays.reduce((sum, day) => sum + day.calories, 0) / foodDays.length) : null;
  const avgProtein = foodDays.length ? Math.round(foodDays.reduce((sum, day) => sum + day.protein, 0) / foodDays.length) : null;

  const attention = [
    taskStats.overdue > 0 && `${taskStats.overdue} overdue task${taskStats.overdue === 1 ? "" : "s"} need rescheduling.`,
    reviewItems.length > 0 && `${reviewItems.length} inbox review item${reviewItems.length === 1 ? "" : "s"} still need a decision.`,
    habitRate !== null && habitRate < 70 && `Habit consistency is ${habitRate}%. Pick the smallest version for next week.`,
    avgProtein !== null && avgProtein < foodTargets.protein * 0.75 && `Protein averaged ${avgProtein}g against a ${foodTargets.protein}g target.`,
    goalStats.active.length > 0 && goalStats.average !== null && goalStats.average < 40 && `Active goals average ${goalStats.average}% progress.`,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <main className="mx-auto max-w-[1500px] space-y-4 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="rounded-xl border border-line bg-panel p-5 shadow-glow">
          <p className="text-sm text-muted">Weekly review</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Your week</h1>
          <p className="mt-2 text-sm text-muted">{keys[0]} to {keys[6]}</p>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Tasks" value={`${taskStats.completed}/${taskStats.due}`} detail={`${completedTasks.length} completed due items`} icon={CheckSquare2} />
          <MetricCard label="Schedule" value={`${scheduleHours.toFixed(1)}h`} detail={`${meetings.length} calendar blocks`} icon={CalendarDays} />
          <MetricCard label="Habits" value={habitRate !== null ? `${habitRate}%` : "—"} detail={habits.length ? `${habitHits}/${habitPossible} completions` : "no habits configured"} icon={Flame} />
          <MetricCard label="Gym" value={gymThisWeek.length} detail="sessions completed" icon={Dumbbell} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <h2 className="text-sm font-semibold text-ink">Time by label</h2>
              <div className="mt-4 space-y-3">
                {timeByLabel.slice(0, 8).map(({ responsibility, hours }) => {
                  const tone = getTone(responsibility.color);
                  const max = Math.max(...timeByLabel.map((row) => row.hours), 1);
                  return (
                    <Link key={responsibility.id} href={`/r/${responsibility.id}`} className="grid gap-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-ink">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                          <span className="truncate">{responsibility.name}</span>
                        </span>
                        <span className="text-muted">{hours.toFixed(1)}h</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full" style={{ width: `${(hours / max) * 100}%`, backgroundColor: tone.hex }} />
                      </div>
                    </Link>
                  );
                })}
                {!timeByLabel.length && <p className="rounded-lg bg-paper p-4 text-sm text-muted">No scheduled or logged time this week.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <h2 className="text-sm font-semibold text-ink">Plan next week</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href="/inbox" className="rounded-lg bg-paper p-4 transition hover:bg-hover">
                  <Inbox className="size-4 text-blue" />
                  <p className="mt-2 text-sm font-medium text-ink">Clear inbox decisions</p>
                  <p className="mt-1 text-xs text-muted">{reviewItems.length} waiting</p>
                </Link>
                <Link href="/tasks" className="rounded-lg bg-paper p-4 transition hover:bg-hover">
                  <CheckSquare2 className="size-4 text-mint" />
                  <p className="mt-2 text-sm font-medium text-ink">Review task load</p>
                  <p className="mt-1 text-xs text-muted">{taskStats.overdue} overdue</p>
                </Link>
                <Link href="/goals" className="rounded-lg bg-paper p-4 transition hover:bg-hover">
                  <Target className="size-4 text-blue" />
                  <p className="mt-2 text-sm font-medium text-ink">Check active goals</p>
                  <p className="mt-1 text-xs text-muted">{goalStats.active.length} active</p>
                </Link>
                <Link href="/food" className="rounded-lg bg-paper p-4 transition hover:bg-hover">
                  <Utensils className="size-4 text-muted" />
                  <p className="mt-2 text-sm font-medium text-ink">Review nutrition</p>
                  <p className="mt-1 text-xs text-muted">{avgCalories ? `${avgCalories} avg calories` : "not logged"}</p>
                </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <AlertCircle className="size-4 text-blue" />
                Needs attention
              </h2>
              <div className="mt-4 space-y-2">
                {attention.length ? attention.map((item) => (
                  <p key={item} className="rounded-lg bg-paper p-3 text-sm leading-6 text-muted">{item}</p>
                )) : (
                  <p className="rounded-lg bg-paper p-3 text-sm text-muted">No obvious blockers. Keep the next week simple.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-panel p-4 shadow-glow">
              <h2 className="text-sm font-semibold text-ink">Nutrition average</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-2xl font-semibold text-ink">{avgCalories ?? "—"}</p>
                  <p className="text-xs text-muted">calories</p>
                </div>
                <div className="rounded-lg bg-paper p-3">
                  <p className="text-2xl font-semibold text-ink">{avgProtein ?? "—"}g</p>
                  <p className="text-xs text-muted">protein</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
