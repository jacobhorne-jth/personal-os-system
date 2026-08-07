import { localDateKey } from "@/lib/dates";
import { expandCalendarItems } from "@/lib/recurrence";
import type { CalendarItem, CaptureExtraction, FoodEntry, Goal, GymSession, Habit, HabitLog, Task } from "@/lib/types/domain";

export function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateKeyOf(value: string | Date) {
  return localDateKey(typeof value === "string" ? new Date(value) : value);
}

export function dayBounds(dateKey: string) {
  const start = dateFromKey(dateKey);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export function weekBounds(dateKey = localDateKey()) {
  const start = dateFromKey(dateKey);
  const day = start.getDay();
  start.setDate(start.getDate() - ((day + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const keys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
  return { start, end, keys };
}

export function taskDate(task: Pick<Task, "dueAt">) {
  return task.dueAt?.slice(0, 10);
}

export function tasksForDay(tasks: Task[], dateKey: string) {
  return tasks
    .filter((task) => {
      if (task.status === "done") return false;
      const due = taskDate(task);
      return due !== undefined && (dateKey === localDateKey() ? due <= dateKey : due === dateKey);
    })
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export function eventsForDay(calendarItems: CalendarItem[], dateKey: string) {
  const { start, end } = dayBounds(dateKey);
  return expandCalendarItems(calendarItems, start, end)
    .filter((item) => item.type !== "task_due" && item.type !== "time_log" && dateKeyOf(item.startsAt) === dateKey)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function activeReviewItems(items: CaptureExtraction[]) {
  return items.filter((item) => {
    if (item.status === "approved" || item.status === "rejected") return false;
    return !item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= Date.now();
  });
}

export function habitProgressForDate(habits: Habit[], logs: HabitLog[], dateKey: string) {
  const rows = habits.map((habit) => {
    const value = logs.find((log) => log.habitId === habit.id && log.date === dateKey)?.value ?? 0;
    const complete = habit.type === "avoid" ? value === 0 : value >= habit.target;
    return { habit, value, complete };
  });
  return {
    rows,
    completed: rows.filter((row) => row.complete).length,
    total: rows.length,
  };
}

export function foodTotalsForDate(entries: FoodEntry[], dateKey: string) {
  return entries
    .filter((entry) => entry.date === dateKey)
    .reduce(
      (total, entry) => ({
        calories: total.calories + entry.calories,
        protein: total.protein + entry.protein,
      }),
      { calories: 0, protein: 0 },
    );
}

export function gymSessionsForWeek(sessions: GymSession[], dateKey = localDateKey()) {
  const { keys } = weekBounds(dateKey);
  return sessions.filter((session) => keys.includes(session.date));
}

export function taskStatsForWeek(tasks: Task[], dateKey = localDateKey()) {
  const { keys } = weekBounds(dateKey);
  const dueThisWeek = tasks.filter((task) => task.dueAt && keys.includes(taskDate(task)!));
  const completed = dueThisWeek.filter((task) => task.status === "done").length;
  const overdue = tasks.filter((task) => task.status !== "done" && taskDate(task) && taskDate(task)! < localDateKey()).length;
  return { due: dueThisWeek.length, completed, overdue };
}

export function goalProgress(goals: Goal[]) {
  const active = goals.filter((goal) => goal.status === "active");
  const average = active.length
    ? Math.round(active.reduce((sum, goal) => sum + Math.min(100, (goal.current / Math.max(1, goal.target)) * 100), 0) / active.length)
    : null;
  return { active, average };
}

export function scheduledHoursForWeek(calendarItems: CalendarItem[], dateKey = localDateKey()) {
  const { start, end } = weekBounds(dateKey);
  return expandCalendarItems(calendarItems, start, end)
    .filter((item) => item.type !== "task_due" && item.type !== "deadline" && item.type !== "reminder")
    .reduce((hours, item) => {
      const startMs = Math.max(new Date(item.startsAt).getTime(), start.getTime());
      const endMs = Math.min(new Date(item.endsAt).getTime(), end.getTime());
      return hours + Math.max(0, endMs - startMs) / 3_600_000;
    }, 0);
}
