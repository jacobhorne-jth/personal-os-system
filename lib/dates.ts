export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateKeyOf(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return localDateKey(dateFromKey(value));
  }
  return localDateKey(typeof value === "string" ? new Date(value) : value);
}

// Habit days roll over at 4 AM, not midnight: finishing a habit at 1 AM still
// counts toward the evening you're coming from, and streaks don't break while
// you're still awake.
export const DAY_ROLLOVER_HOUR = 4;

export function effectiveNow(): Date {
  const d = new Date();
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR);
  return d;
}

export function effectiveDateKey(): string {
  return localDateKey(effectiveNow());
}

// The habit-day a timestamp belongs to (1 AM belongs to the previous day)
export function effectiveDateKeyOf(date: Date): string {
  const d = new Date(date);
  d.setHours(d.getHours() - DAY_ROLLOVER_HOUR);
  return localDateKey(d);
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function formatDateHeading(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function detectedTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
}
