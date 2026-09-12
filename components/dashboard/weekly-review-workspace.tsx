"use client";

import Link from "next/link";
import { ArrowUpRight, CheckSquare2, Inbox, Target, Utensils } from "lucide-react";
import { Card, CardHeader, Page, PageHeader, ProgressBar, Stat } from "@/components/ui/primitives";
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
import { dateFromKey, localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

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
    reviewItems.length > 0 && `${reviewItems.length} inbox item${reviewItems.length === 1 ? "" : "s"} still need a decision.`,
    habitRate !== null && habitRate < 70 && `Habit consistency is ${habitRate}%. Pick the smallest version for next week.`,
    avgProtein !== null && avgProtein < foodTargets.protein * 0.75 && `Protein averaged ${avgProtein}g against a ${foodTargets.protein}g target.`,
    goalStats.active.length > 0 && goalStats.average !== null && goalStats.average < 40 && `Active goals average ${goalStats.average}% progress.`,
  ].filter(Boolean) as string[];
  const highlights = [
    completedTasks.length > 0 && `Completed ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"} due this week.`,
    gymThisWeek.length > 0 && `Logged ${gymThisWeek.length} workout${gymThisWeek.length === 1 ? "" : "s"}.`,
    habitRate !== null && habitRate >= 80 && `Hit ${habitRate}% habit consistency.`,
    reviewItems.length === 0 && "Inbox is clear.",
    goalStats.average !== null && goalStats.average >= 60 && `Active goals average ${goalStats.average}% progress.`,
  ].filter(Boolean) as string[];

  const fmt = (key: string) => dateFromKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const maxHours = Math.max(...timeByLabel.map((row) => row.hours), 1);

  const nextSteps = [
    { href: "/inbox", icon: Inbox, title: "Clear inbox decisions", detail: `${reviewItems.length} waiting` },
    { href: "/tasks", icon: CheckSquare2, title: "Review task load", detail: `${taskStats.overdue} overdue` },
    { href: "/goals", icon: Target, title: "Check active goals", detail: `${goalStats.active.length} active` },
    { href: "/food", icon: Utensils, title: "Review nutrition", detail: avgCalories ? `${avgCalories} avg calories` : "Not logged" },
  ];

  return (
    <Page width="wide">
      <PageHeader title="Weekly review" description={`${fmt(keys[0])} – ${fmt(keys[6])}`} />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tasks done" value={`${taskStats.completed}/${taskStats.due}`} detail={taskStats.overdue ? `${taskStats.overdue} overdue` : "due this week"} />
        <Stat label="Scheduled" value={`${scheduleHours.toFixed(1)}h`} detail={`${meetings.length} calendar blocks`} />
        <Stat label="Habits" value={habitRate !== null ? `${habitRate}%` : "—"} detail={habits.length ? `${habitHits}/${habitPossible} check-ins` : "No habits yet"} />
        <Stat label="Workouts" value={gymThisWeek.length} detail="sessions logged" />
      </section>

      <Card className="mb-5 overflow-hidden">
        <CardHeader title="Day by day" meta="tasks · events · habits" />
        <div className="grid grid-cols-7 divide-x divide-line">
          {keys.map((key) => {
            const date = dateFromKey(key);
            const due = tasks.filter((task) => task.dueAt && taskDate(task) === key);
            const done = due.filter((task) => task.status === "done").length;
            const dayEvents = meetings.filter((item) => dateKeyOf(item.startsAt) === key).length;
            const dayHabits = habitProgressForDate(habits, habitLogs, key);
            const isToday = key === today;
            const future = key > today;
            return (
              <div key={key} className={cn("px-2 py-3 sm:px-3", future && "opacity-50")}>
                <p className="text-[11px] font-medium text-subtle">{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className={cn("text-base font-semibold tabular-nums", isToday ? "text-now" : "text-ink")}>{date.getDate()}</p>
                <dl className="mt-2 space-y-1 text-xs tabular-nums">
                  <div className="flex justify-between gap-1"><dt className="hidden text-muted sm:block">Tasks</dt><dd className="text-ink">{done}/{due.length}</dd></div>
                  <div className="flex justify-between gap-1"><dt className="hidden text-muted sm:block">Events</dt><dd className="text-ink">{dayEvents}</dd></div>
                  <div className="flex justify-between gap-1"><dt className="hidden text-muted sm:block">Habits</dt><dd className="text-ink">{dayHabits.total ? `${dayHabits.completed}/${dayHabits.total}` : "—"}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      </Card>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader title="Time by label" meta={timeByLabel.length ? `${timeByLabel.reduce((sum, row) => sum + row.hours, 0).toFixed(1)}h` : undefined} />
            <div className="space-y-3 p-4">
              {timeByLabel.slice(0, 8).map(({ responsibility, hours }) => {
                const tone = getTone(responsibility.color);
                return (
                  <Link key={responsibility.id} href={`/r/${responsibility.id}`} className="group grid gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-ink">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                        <span className="truncate group-hover:underline">{responsibility.name}</span>
                      </span>
                      <span className="tabular-nums text-muted">{hours.toFixed(1)}h</span>
                    </div>
                    <ProgressBar value={(hours / maxHours) * 100} color={tone.hex} />
                  </Link>
                );
              })}
              {!timeByLabel.length && <p className="py-2 text-[13px] text-muted">No scheduled or logged time this week.</p>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Plan next week" />
            <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
              {nextSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.href}
                    href={step.href}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-hover/50",
                      index % 2 === 0 && "sm:border-r sm:border-line",
                      index < 2 && "sm:border-b sm:border-line"
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{step.title}</span>
                      <span className="block text-xs text-muted">{step.detail}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-subtle transition-colors group-hover:text-ink" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-4">
            <p className="text-[13px] font-semibold text-ink">Highlights</p>
            <ul className="mt-3 space-y-2">
              {highlights.length ? highlights.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-6 text-ink">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-success" />
                  {item}
                </li>
              )) : (
                <li className="text-[13px] text-muted">No clear wins yet. One small one next week is enough to start.</li>
              )}
            </ul>
          </Card>

          <Card className="p-4">
            <p className="text-[13px] font-semibold text-ink">Needs attention</p>
            <ul className="mt-3 space-y-2">
              {attention.length ? attention.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-6 text-ink">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-warning" />
                  {item}
                </li>
              )) : (
                <li className="text-[13px] text-muted">No obvious blockers. Keep next week simple.</li>
              )}
            </ul>
          </Card>

          <Card className="grid grid-cols-2 divide-x divide-line">
            <div className="p-4">
              <p className="text-[13px] text-muted">Avg calories</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{avgCalories ?? "—"}</p>
            </div>
            <div className="p-4">
              <p className="text-[13px] text-muted">Avg protein</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{avgProtein !== null ? `${avgProtein}g` : "—"}</p>
            </div>
          </Card>
        </aside>
      </section>
    </Page>
  );
}
