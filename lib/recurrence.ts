import type { CalendarItem } from "@/lib/types/domain";

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

// ─── Recurring calendar events ────────────────────────────────────────────────

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

function stepForRule(rule: string): { days?: number; months?: number; years?: number; weekday?: number } | null {
  if (rule === "every day") return { days: 1 };
  if (rule === "every week") return { days: 7 };
  if (rule === "every other week") return { days: 14 };
  if (rule === "every month") return { months: 1 };
  if (rule === "every year") return { years: 1 };
  const m = /^every\s+(\w+)$/.exec(rule);
  if (m && m[1] in DAY_INDEX) return { weekday: DAY_INDEX[m[1]] };
  return null;
}

/**
 * Expand a recurring master event into concrete instances within [rangeStart,
 * rangeEnd). The master's own occurrence is included when in range. Dates in
 * recurrenceExceptions are skipped. Instances get a synthetic id
 * `${master.id}::${YYYY-MM-DD}` and carry seriesId back to the master.
 */
export function expandRecurringEvent(master: CalendarItem, rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const rule = master.recurrence?.trim().toLowerCase();
  if (!rule) return [];
  const step = stepForRule(rule);
  if (!step) return [];

  const durationMs = new Date(master.endsAt).getTime() - new Date(master.startsAt).getTime();
  const exceptions = new Set(master.recurrenceExceptions ?? []);
  const out: CalendarItem[] = [];

  const cursor = new Date(master.startsAt);
  // Weekday rules: the master start may already be on the right weekday;
  // if not, advance to the first matching weekday.
  if (step.weekday !== undefined) {
    const delta = (step.weekday - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + delta);
  }

  for (let guard = 0; guard < 400 && cursor < rangeEnd; guard++) {
    const key = localDateKey(cursor);
    if (cursor >= rangeStart && !exceptions.has(key)) {
      const startsAt = cursor.toISOString();
      out.push({
        ...master,
        id: `${master.id}::${key}`,
        seriesId: master.id,
        startsAt,
        endsAt: new Date(cursor.getTime() + durationMs).toISOString(),
      });
    }
    if (step.weekday !== undefined || step.days) {
      cursor.setDate(cursor.getDate() + (step.days ?? 7));
    } else if (step.months) {
      cursor.setMonth(cursor.getMonth() + step.months);
    } else if (step.years) {
      cursor.setFullYear(cursor.getFullYear() + step.years);
    }
  }
  return out;
}

/**
 * Expand every recurring master in `items` for the given range and return the
 * expanded list merged with all non-recurring items. Masters themselves are
 * replaced by their instances.
 */
export function expandCalendarItems(items: CalendarItem[], rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const out: CalendarItem[] = [];
  for (const item of items) {
    if (item.recurrence) {
      out.push(...expandRecurringEvent(item, rangeStart, rangeEnd));
    } else {
      out.push(item);
    }
  }
  return out;
}
