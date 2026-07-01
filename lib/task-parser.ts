"use client";

export type ParsedChip = {
  label: string;
  type: "date" | "time" | "recurrence" | "label";
};

export type ParseResult = {
  cleanTitle: string;
  dueDate?: Date;
  dueTime?: { hour: number; minute: number };
  recurrence?: string;
  labelHint?: string;
  chips: ParsedChip[];
};

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

const DAY_FULL: Record<string, string> = {
  sun: "Sunday", sunday: "Sunday", mon: "Monday", monday: "Monday",
  tue: "Tuesday", tuesday: "Tuesday", wed: "Wednesday", wednesday: "Wednesday",
  thu: "Thursday", thursday: "Thursday", fri: "Friday", friday: "Friday",
  sat: "Saturday", saturday: "Saturday",
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextWeekday(dow: number): Date {
  const d = startOfToday();
  const diff = ((dow - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function chipForDate(d: Date): string {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 7) return days[d.getDay()];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function chipForTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = minute ? `:${String(minute).padStart(2, "0")}` : "";
  return `${h}${m} ${period}`;
}

function strip(text: string, match: string): string {
  return text.replace(match, " ");
}

export function parseInput(raw: string, knownLabels: string[] = []): ParseResult {
  let s = raw;
  let dueDate: Date | undefined;
  let dueTime: { hour: number; minute: number } | undefined;
  let recurrence: string | undefined;
  let labelHint: string | undefined;
  const chips: ParsedChip[] = [];

  // ── Label @mention ────────────────────────────────────────────────────────

  const mentionMatch = s.match(/@([\w-]+)/);
  if (mentionMatch) {
    const word = mentionMatch[1].toLowerCase();
    const matched = knownLabels.find(
      (l) => l.toLowerCase() === word || l.toLowerCase().startsWith(word)
    );
    if (matched) {
      labelHint = matched;
      chips.push({ label: `@${matched}`, type: "label" });
      s = strip(s, mentionMatch[0]);
    }
  }

  // ── Recurrence (before day names to avoid double-match) ────────────────────

  const recurTests: Array<[RegExp, string | null]> = [
    [/\bevery\s+other\s+week\b/i,                  "every other week"],
    [/\b(every\s+day|daily|everyday)\b/i,           "every day"],
    [/\b(every\s+week|weekly)\b/i,                  "every week"],
    [/\b(every\s+month|monthly)\b/i,                "every month"],
    [/\b(every\s+year|yearly|annually)\b/i,         "every year"],
    [/\bevery\s+(sun|sunday|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday)\b/i, null],
  ];

  for (const [re, label] of recurTests) {
    const m = s.match(re);
    if (!m) continue;
    if (label) {
      recurrence = label;
    } else {
      // "every [dayname]" — extract the day from capture group 1
      recurrence = `every ${DAY_FULL[m[1].toLowerCase()] ?? m[1]}`;
    }
    chips.push({ label: recurrence, type: "recurrence" });
    s = strip(s, m[0]);
    break;
  }

  // ── Dates ──────────────────────────────────────────────────────────────────

  const dateTests: Array<[RegExp, (m: RegExpMatchArray) => Date | undefined]> = [
    [/\b(tod|today)\b/i,          () => startOfToday()],
    [/\b(tmrw|tom|tomorrow)\b/i,  () => { const d = startOfToday(); d.setDate(d.getDate() + 1); return d; }],
    [/\bnext\s+week\b/i,          () => { const d = startOfToday(); d.setDate(d.getDate() + 7); return d; }],
    [/\bin\s+(\d+|a)\s+(days?|weeks?)\b/i, (m: RegExpMatchArray) => {
      if (!m) return;
      const n = m[1] === "a" ? 1 : parseInt(m[1]);
      const d = startOfToday();
      d.setDate(d.getDate() + n * (m[2].startsWith("w") ? 7 : 1));
      return d;
    }],
    // day names: mon, fri, wednesday etc.
    [/\b(this\s+)?(sun|sunday|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday)\b/i, (m: RegExpMatchArray) => {
      const dow = DAY_MAP[(m[2] ?? m[1]).toLowerCase()];
      return dow !== undefined ? nextWeekday(dow) : undefined;
    }],
    // jan 15, march 3rd, etc.
    [/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, (m: RegExpMatchArray) => {
      const month = MONTH_MAP[m[1].toLowerCase()];
      const day = parseInt(m[2]);
      if (month === undefined || day < 1 || day > 31) return;
      const d = startOfToday();
      d.setMonth(month, day);
      if (d < startOfToday()) d.setFullYear(d.getFullYear() + 1);
      return d;
    }],
    // MM/DD
    [/\b(\d{1,2})\/(\d{1,2})\b/, (m: RegExpMatchArray) => {
      const month = parseInt(m[1]) - 1;
      const day = parseInt(m[2]);
      if (month < 0 || month > 11 || day < 1 || day > 31) return;
      const d = startOfToday();
      d.setMonth(month, day);
      if (d < startOfToday()) d.setFullYear(d.getFullYear() + 1);
      return d;
    }],
  ];

  for (const [re, fn] of dateTests) {
    if (dueDate) break;
    const m = s.match(re);
    if (!m) continue;
    const result = fn(m as RegExpMatchArray);
    if (!result) continue;
    dueDate = result;
    chips.push({ label: chipForDate(dueDate), type: "date" });
    s = strip(s, m[0]);
  }

  // ── Times ──────────────────────────────────────────────────────────────────

  const timeTests: Array<[RegExp, (m: RegExpMatchArray) => { hour: number; minute: number } | undefined]> = [
    [/\bnoon\b/i,      () => ({ hour: 12, minute: 0 })],
    [/\bmidnight\b/i,  () => ({ hour: 0,  minute: 0 })],
    [/\bmorning\b/i,   () => ({ hour: 9,  minute: 0 })],
    [/\bafternoon\b/i, () => ({ hour: 13, minute: 0 })],
    [/\bevening\b/i,   () => ({ hour: 18, minute: 0 })],
    [/\bnight\b/i,     () => ({ hour: 20, minute: 0 })],
    // "at 3pm", "at 3:30pm", "3pm", "3:30pm"
    [/\bat?\s*(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i, (m) => {
      let h = parseInt(m[1]);
      const min = m[2] ? parseInt(m[2]) : 0;
      const p = m[3].toLowerCase();
      if (p === "pm" && h !== 12) h += 12;
      if (p === "am" && h === 12) h = 0;
      return { hour: h, minute: min };
    }],
  ];

  for (const [re, fn] of timeTests) {
    if (dueTime) break;
    const m = s.match(re);
    if (!m) continue;
    const result = fn(m as RegExpMatchArray);
    if (!result) continue;
    dueTime = result;
    chips.push({ label: chipForTime(dueTime.hour, dueTime.minute), type: "time" });
    s = strip(s, m[0]);
  }

  // ── Clean title ────────────────────────────────────────────────────────────

  const cleanTitle = s.replace(/\s{2,}/g, " ").trim();

  return { cleanTitle, dueDate, dueTime, recurrence, labelHint, chips };
}

export function buildDueAt(date?: Date, time?: { hour: number; minute: number }): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  d.setHours(time?.hour ?? 17, time?.minute ?? 0, 0, 0);
  return d.toISOString();
}
