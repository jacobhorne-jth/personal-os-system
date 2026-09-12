"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfWeek } from "@/lib/calendar-generated";
import { expandCalendarItems } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTone } from "@/lib/theme";
import type { CalendarItem, CalendarItemType } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function miniMonthDays(displayMonth: Date, today: Date) {
  const first = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dateKey(date),
      date: new Date(date),
      day: date.getDate(),
      inMonth: date.getMonth() === displayMonth.getMonth(),
      isToday: date.toDateString() === today.toDateString()
    };
  });
}

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return {
    start,
    end,
    title: "Time today",
    label: start.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  };
}

function weekRange(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const labelEnd = new Date(end);
  labelEnd.setDate(end.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { start, end, title: "Time this week", label: `${fmt(start)} – ${fmt(labelEnd)}` };
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start,
    end,
    title: "Time this month",
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  };
}

function overlapMinutes(item: CalendarItem, start: Date, end: Date) {
  const itemStart = new Date(item.startsAt).getTime();
  const itemEnd = new Date(item.endsAt).getTime();
  const overlapStart = Math.max(itemStart, start.getTime());
  const overlapEnd = Math.min(itemEnd, end.getTime());
  return Math.max(0, Math.round((overlapEnd - overlapStart) / 60000));
}

function formatHours(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

const INSIGHT_TYPES = new Set<CalendarItemType>(["external_event", "app_event", "time_block", "time_log"]);

function isAllDayLike(item: CalendarItem) {
  const start = new Date(item.startsAt);
  const end = new Date(item.endsAt);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0;
  const endsAtDayEnd = end.getHours() === 23 && end.getMinutes() >= 55;
  const endsAtNextMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getDate() !== start.getDate();
  return startsAtMidnight && (endsAtDayEnd || endsAtNextMidnight || durationMinutes >= 23 * 60);
}

function isInsightItem(item: CalendarItem) {
  return INSIGHT_TYPES.has(item.type) && !isAllDayLike(item);
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function currentDayStamp() {
  return new Date().toDateString();
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarSidebar() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const { calendarView, hiddenResponsibilities, toggleResponsibility, setCalendarGotoDate, selectedDate } = useUiStore();
  const [monthOffset, setMonthOffset] = useState(0);
  const [todayStamp, setTodayStamp] = useState(() => currentDayStamp());
  const today = useMemo(() => new Date(todayStamp), [todayStamp]);

  useEffect(() => {
    function syncToday() {
      setTodayStamp(currentDayStamp());
    }

    const interval = window.setInterval(syncToday, 60_000);
    window.addEventListener("focus", syncToday);
    document.addEventListener("visibilitychange", syncToday);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncToday);
      document.removeEventListener("visibilitychange", syncToday);
    };
  }, []);

  // Browsing the calendar resets the mini month to the focused date
  useEffect(() => {
    setMonthOffset(0);
  }, [selectedDate]);

  const selectedDay = useMemo(() => dateFromKey(selectedDate), [selectedDate]);
  const displayMonth = useMemo(() => new Date(selectedDay.getFullYear(), selectedDay.getMonth() + monthOffset, 1), [selectedDay, monthOffset]);
  const monthDays = useMemo(() => miniMonthDays(displayMonth, today), [displayMonth, today]);
  const insightRange = useMemo(() => {
    if (calendarView === "day") return dayRange(selectedDay);
    if (calendarView === "month") return monthRange(selectedDay);
    return weekRange(selectedDay);
  }, [calendarView, selectedDay]);
  const timeInsights = useMemo(() => {
    const allItems = expandCalendarItems(calendarItems, insightRange.start, insightRange.end).filter(
      (item) => isInsightItem(item) && !hiddenResponsibilities.includes(item.responsibilityId)
    );
    const minutesByResponsibility = allItems.reduce<Record<string, number>>((current, item) => {
      const minutes = overlapMinutes(item, insightRange.start, insightRange.end);
      if (minutes <= 0) return current;
      return {
        ...current,
        [item.responsibilityId]: (current[item.responsibilityId] ?? 0) + minutes
      };
    }, {});
    const segments = responsibilities
      .map((responsibility) => ({
        id: responsibility.id,
        name: responsibility.name,
        minutes: minutesByResponsibility[responsibility.id] ?? 0,
        color: getTone(responsibility.color).hex
      }))
      .filter((item) => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    const totalMinutes = segments.reduce((sum, item) => sum + item.minutes, 0);
    return { segments, totalMinutes };
  }, [calendarItems, hiddenResponsibilities, insightRange.end, insightRange.start, responsibilities]);

  return (
    <aside className="hidden min-h-0 w-[272px] shrink-0 flex-col overflow-y-auto border-l border-line bg-paper px-5 py-5 xl:flex">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">
            {displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <div className="-mr-1.5 flex">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7">
          {DAYS.map((d, i) => (
            <div key={i} className="flex h-7 items-center justify-center text-[11px] font-medium text-subtle">
              {d}
            </div>
          ))}
          {monthDays.map((d) => {
            const selected = d.key === selectedDate;
            return (
              <button
                key={d.key}
                onClick={() => setCalendarGotoDate(d.date.toISOString())}
                aria-label={d.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                className={cn(
                  "mx-auto flex size-8 items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                  d.isToday && "bg-now font-semibold text-white",
                  !d.isToday && selected && "bg-ink/[0.08] font-semibold text-ink",
                  !d.isToday && !selected && d.inMonth && "text-ink hover:bg-hover",
                  !d.isToday && !selected && !d.inMonth && "text-subtle hover:bg-hover"
                )}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 border-t border-line pt-5">
        <p className="mb-2 text-[13px] font-semibold text-ink">Labels</p>
        <div className="-mx-2 space-y-px">
          {responsibilities.filter((resp) => !resp.archivedAt).map((item) => {
            const tone = getTone(item.color);
            const hidden = hiddenResponsibilities.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleResponsibility(item.id)}
                aria-pressed={!hidden}
                aria-label={`${hidden ? "Show" : "Hide"} ${item.name}`}
                className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] transition-colors hover:bg-hover"
              >
                <span
                  className="grid size-4 shrink-0 place-items-center rounded-[4px] transition-colors"
                  style={{ backgroundColor: hidden ? "transparent" : tone.hex, boxShadow: hidden ? `inset 0 0 0 1.5px ${tone.hex}` : undefined }}
                >
                  {!hidden && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={cn("flex-1 truncate", hidden ? "text-subtle" : "text-ink")}>{item.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 border-t border-line pt-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">{insightRange.title}</p>
          <p className="truncate text-xs tabular-nums text-muted">{formatHours(timeInsights.totalMinutes)}</p>
        </div>
        <p className="mb-2 text-xs text-subtle">{insightRange.label}</p>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-hover">
          {timeInsights.segments.map((segment) => (
            <div
              key={segment.id}
              title={`${segment.name}: ${formatHours(segment.minutes)}`}
              style={{ width: `${(segment.minutes / timeInsights.totalMinutes) * 100}%`, backgroundColor: segment.color }}
            />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {timeInsights.segments.slice(0, 6).map((segment) => (
            <div key={segment.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="truncate">{segment.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted">{formatHours(segment.minutes)}</span>
            </div>
          ))}
          {timeInsights.segments.length === 0 && <p className="text-xs text-muted">Nothing scheduled in this range.</p>}
        </div>
      </section>
    </aside>
  );
}
