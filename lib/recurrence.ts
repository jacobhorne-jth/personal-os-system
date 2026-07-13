const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Compute the next due date for a recurring task.
 * Recurrence strings come from lib/task-parser.ts: "every day", "every week",
 * "every other week", "every month", "every year", "every monday" … "every sunday".
 * Returns undefined for unrecognized strings.
 *
 * The next occurrence is always in the future relative to `from` (defaults to now),
 * advancing from the task's due date when it's ahead of `from`. Time of day from
 * `dueAt` is preserved; without one it defaults to 17:00 like buildDueAt.
 */
export function nextOccurrence(recurrence: string, dueAt?: string, from: Date = new Date()): string | undefined {
  const rule = recurrence.trim().toLowerCase();
  const due = dueAt ? new Date(dueAt) : undefined;

  // Base: the later of (due date, now) so overdue tasks jump to the future
  const base = due && due > from ? new Date(due) : new Date(from);
  if (due) {
    base.setHours(due.getHours(), due.getMinutes(), 0, 0);
  } else {
    base.setHours(17, 0, 0, 0);
  }

  const next = new Date(base);

  const dayMatch = /^every\s+(\w+)$/.exec(rule);
  const dayName = dayMatch ? dayMatch[1] : "";

  if (rule === "every day") {
    next.setDate(next.getDate() + 1);
  } else if (rule === "every week") {
    next.setDate(next.getDate() + 7);
  } else if (rule === "every other week") {
    next.setDate(next.getDate() + 14);
  } else if (rule === "every month") {
    next.setMonth(next.getMonth() + 1);
  } else if (rule === "every year") {
    next.setFullYear(next.getFullYear() + 1);
  } else if (dayName in DAY_INDEX) {
    const target = DAY_INDEX[dayName];
    const delta = (target - next.getDay() + 7) % 7 || 7; // strictly future
    next.setDate(next.getDate() + delta);
  } else {
    return undefined;
  }

  return next.toISOString();
}
