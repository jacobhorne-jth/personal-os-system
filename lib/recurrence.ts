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

// ─── Structured recurrence rules (Google Calendar-style) ─────────────────────
// Stored as JSON in CalendarItem.recurrence; legacy phrase strings
// ("every monday", "every week", …) still parse for old data.

export type RecurrenceRule = {
  freq: "day" | "week" | "month" | "year";
  interval: number;
  days?: number[]; // weekly: selected weekdays, 0=Sun … 6=Sat
  nth?: { week: number; day: number }; // monthly: nth weekday; week 1-4 or -1 for last
  until?: string; // YYYY-MM-DD, inclusive
  count?: number; // total scheduled occurrences
};

export function parseRecurrence(raw: string | undefined | null): RecurrenceRule | null {
  const s = raw?.trim();
  if (!s) return null;
  if (s.startsWith("{")) {
    try {
      const rule = JSON.parse(s) as RecurrenceRule;
      if (!rule.freq || !rule.interval) return null;
      return rule;
    } catch {
      return null;
    }
  }
  const legacy = s.toLowerCase();
  if (legacy === "every day") return { freq: "day", interval: 1 };
  if (legacy === "every week") return { freq: "week", interval: 1 };
  if (legacy === "every other week") return { freq: "week", interval: 2 };
  if (legacy === "every month") return { freq: "month", interval: 1 };
  if (legacy === "every year") return { freq: "year", interval: 1 };
  const m = /^every\s+(\w+)$/.exec(legacy);
  if (m && m[1] in DAY_INDEX) return { freq: "week", interval: 1, days: [DAY_INDEX[m[1]]] };
  return null;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

export function nthWeekdayOfDate(d: Date): { week: number; day: number } {
  const week = Math.floor((d.getDate() - 1) / 7) + 1;
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const isLast = d.getDate() + 7 > daysInMonth;
  return { week: week >= 4 && isLast ? -1 : week, day: d.getDay() };
}

export function describeRecurrence(raw: string | undefined | null, start: Date): string {
  const rule = parseRecurrence(raw);
  if (!rule) return "Does not repeat";
  let base: string;
  if (rule.freq === "day") {
    base = rule.interval === 1 ? "Daily" : `Every ${rule.interval} days`;
  } else if (rule.freq === "week") {
    const days = rule.days?.length ? rule.days : [start.getDay()];
    const sorted = [...days].sort((a, b) => a - b);
    const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1);
    const names = isWeekdays ? "weekday (Monday to Friday)" : sorted.map((d) => WEEKDAY_NAMES[d]).join(", ");
    if (rule.interval === 1) {
      base = isWeekdays ? "Every weekday (Monday to Friday)" : `Weekly on ${names}`;
    } else {
      base = `Every ${rule.interval} weeks on ${names}`;
    }
  } else if (rule.freq === "month") {
    if (rule.nth) {
      const ordinal = rule.nth.week === -1 ? "last" : ORDINALS[rule.nth.week - 1];
      base = `Monthly on the ${ordinal} ${WEEKDAY_NAMES[rule.nth.day]}`;
    } else {
      base = rule.interval === 1 ? `Monthly on day ${start.getDate()}` : `Every ${rule.interval} months on day ${start.getDate()}`;
    }
  } else {
    const dateLabel = start.toLocaleDateString([], { month: "long", day: "numeric" });
    base = rule.interval === 1 ? `Annually on ${dateLabel}` : `Every ${rule.interval} years on ${dateLabel}`;
  }
  if (rule.until) {
    const [y, m, d] = rule.until.split("-").map(Number);
    base += `, until ${new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  } else if (rule.count) {
    base += `, ${rule.count} times`;
  }
  return base;
}

function nthWeekdayDate(year: number, month: number, nth: { week: number; day: number }): Date | null {
  if (nth.week === -1) {
    const last = new Date(year, month + 1, 0);
    const delta = (last.getDay() - nth.day + 7) % 7;
    return new Date(year, month, last.getDate() - delta);
  }
  const first = new Date(year, month, 1);
  const delta = (nth.day - first.getDay() + 7) % 7;
  const date = 1 + delta + (nth.week - 1) * 7;
  if (date > new Date(year, month + 1, 0).getDate()) return null;
  return new Date(year, month, date);
}

function weekStartOf(d: Date): number {
  const w = new Date(d);
  w.setHours(0, 0, 0, 0);
  w.setDate(w.getDate() - w.getDay());
  return w.getTime();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Expand a recurring master event into concrete instances within [rangeStart,
 * rangeEnd). The master's own occurrence is included when in range. Dates in
 * recurrenceExceptions are skipped; `until`/`count` end the series. Instances
 * get a synthetic id `${master.id}::${YYYY-MM-DD}` with seriesId → master.
 */
export function expandRecurringEvent(master: CalendarItem, rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const rule = parseRecurrence(master.recurrence);
  if (!rule) return [];

  const masterStart = new Date(master.startsAt);
  const durationMs = new Date(master.endsAt).getTime() - masterStart.getTime();
  const exceptions = new Set(master.recurrenceExceptions ?? []);
  const untilEnd = rule.until ? new Date(`${rule.until}T23:59:59`) : null;
  const out: CalendarItem[] = [];
  let scheduled = 0;

  const push = (occurrence: Date) => {
    scheduled++;
    const key = localDateKey(occurrence);
    if (occurrence >= rangeStart && occurrence < rangeEnd && !exceptions.has(key)) {
      out.push({
        ...master,
        id: `${master.id}::${key}`,
        seriesId: master.id,
        startsAt: occurrence.toISOString(),
        endsAt: new Date(occurrence.getTime() + durationMs).toISOString(),
      });
    }
  };
  const done = (occurrence: Date) =>
    occurrence >= rangeEnd || (untilEnd !== null && occurrence > untilEnd) || (rule.count !== undefined && scheduled >= rule.count);

  if (rule.freq === "week" && (rule.days?.length ?? 0) > 0) {
    // Walk day by day; include days matching the selected weekdays in weeks
    // aligned to the master's week by the interval
    const anchorWeek = weekStartOf(masterStart);
    const cursor = new Date(masterStart);
    for (let guard = 0; guard < 4000; guard++) {
      if (done(cursor)) break;
      const weeksFromAnchor = Math.round((weekStartOf(cursor) - anchorWeek) / WEEK_MS);
      if (weeksFromAnchor % rule.interval === 0 && rule.days!.includes(cursor.getDay())) {
        push(new Date(cursor));
        if (rule.count !== undefined && scheduled >= rule.count) break;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  if (rule.freq === "month" && rule.nth) {
    const cursor = new Date(masterStart.getFullYear(), masterStart.getMonth(), 1);
    for (let guard = 0; guard < 600; guard++) {
      const occ = nthWeekdayDate(cursor.getFullYear(), cursor.getMonth(), rule.nth);
      if (occ) {
        occ.setHours(masterStart.getHours(), masterStart.getMinutes(), 0, 0);
        if (occ >= masterStart) {
          if (done(occ)) break;
          push(occ);
          if (rule.count !== undefined && scheduled >= rule.count) break;
        }
      }
      cursor.setMonth(cursor.getMonth() + rule.interval);
      if (cursor > rangeEnd && (!rule.count || scheduled >= rule.count)) break;
    }
    return out;
  }

  // Monthly on the same date: months lacking that date (e.g. the 31st) are skipped
  if (rule.freq === "month") {
    for (let i = 0, guard = 0; guard < 600; guard++, i += rule.interval) {
      const occ = new Date(masterStart);
      occ.setMonth(masterStart.getMonth() + i);
      if (occ.getDate() !== masterStart.getDate()) continue;
      if (done(occ)) break;
      push(occ);
      if (rule.count !== undefined && scheduled >= rule.count) break;
    }
    return out;
  }

  // Simple stepping: day / week (on the start weekday) / year
  const cursor = new Date(masterStart);
  for (let guard = 0; guard < 1200; guard++) {
    if (done(cursor)) break;
    push(new Date(cursor));
    if (rule.count !== undefined && scheduled >= rule.count) break;
    if (rule.freq === "day") cursor.setDate(cursor.getDate() + rule.interval);
    else if (rule.freq === "week") cursor.setDate(cursor.getDate() + 7 * rule.interval);
    else cursor.setFullYear(cursor.getFullYear() + rule.interval);
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
