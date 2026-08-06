"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
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
    label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()
  };
}

function weekRange(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const labelEnd = new Date(end);
  labelEnd.setDate(end.getDate() - 1);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const endMonth = labelEnd.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return {
    start,
    end,
    label: `${startMonth} ${start.getDate()} - ${endMonth} ${labelEnd.getDate()}, ${labelEnd.getFullYear()}`
  };
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start,
    end,
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()
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

export function CalendarSidebar() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const { calendarView, hiddenResponsibilities, toggleResponsibility, setCalendarGotoDate, selectedDate } = useUiStore();
  const [monthOffset, setMonthOffset] = useState(0);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const today = useMemo(() => new Date(), []);
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
    <aside className="hidden min-h-0 w-[360px] shrink-0 flex-col border-l border-line bg-panel [--panel-inset:18px] py-4 xl:flex">
      <div className="mb-5 px-[var(--panel-inset)]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          <div className="flex gap-0">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-paper"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-paper"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {DAYS.map((d, i) => (
            <div key={i} className="flex h-8 items-center justify-center text-[11px] font-medium text-muted">
              {d}
            </div>
          ))}
          {monthDays.map((d) => {
            return (
              <button
                key={d.key}
                onClick={() => setCalendarGotoDate(d.date.toISOString())}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs transition mx-auto",
                  d.isToday ? "bg-[#4285f4] font-medium text-white" : "",
                  !d.isToday && d.inMonth ? "text-ink hover:bg-paper" : "",
                  !d.isToday && !d.inMonth ? "text-muted/50 hover:bg-paper" : ""
                )}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-[var(--panel-inset)] mb-4 h-px bg-line" />

      <div className="flex-1 overflow-y-auto px-[var(--panel-inset)]">
        <p className="mb-2 text-xs font-medium text-muted">Responsibilities</p>
        {responsibilities.filter((resp) => !resp.archivedAt).map((item) => {
          const tone = getTone(item.color);
          const hidden = hiddenResponsibilities.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleResponsibility(item.id)}
              className="-mx-3 flex w-[calc(100%+24px)] items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm transition hover:bg-paper"
            >
              <span
                className="grid size-4 shrink-0 place-items-center rounded-sm transition"
                style={{ backgroundColor: hidden ? "transparent" : tone.hex, border: hidden ? "1.5px solid #5f6368" : "none" }}
              >
                {!hidden && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={cn("flex-1 truncate text-sm", hidden ? "text-muted/50" : "text-ink")}>
                {item.name}
              </span>
            </button>
          );
        })}

        <div className="my-5 h-px bg-line" />

        <section>
          <button
            type="button"
            onClick={() => setInsightsOpen((open) => !open)}
            aria-expanded={insightsOpen}
            className="mb-3 flex h-11 w-full items-center justify-between rounded-full bg-paper px-4 text-left transition hover:bg-hover"
          >
            <h2 className="text-base font-semibold text-ink">Time Insights</h2>
            <ChevronDown className={cn("size-5 text-ink transition-transform", insightsOpen && "rotate-180")} />
          </button>
          {insightsOpen && (
            <>
              <p className="px-4 text-sm font-semibold tracking-[0.12em] text-ink">{insightRange.label}</p>
              <div className="mx-4 mt-4 flex h-4 overflow-hidden rounded-full bg-line">
                {timeInsights.totalMinutes > 0 ? (
                  timeInsights.segments.map((segment) => (
                    <div
                      key={segment.id}
                      title={`${segment.name}: ${formatHours(segment.minutes)}`}
                      style={{
                        width: `${(segment.minutes / timeInsights.totalMinutes) * 100}%`,
                        backgroundColor: segment.color
                      }}
                    />
                  ))
                ) : (
                  <div className="h-full w-full bg-[#5f6368]" />
                )}
              </div>
              <div className="mt-4 space-y-2 px-4">
                {timeInsights.segments.slice(0, 6).map((segment) => (
                  <div key={segment.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-ink">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="truncate">{segment.name}</span>
                    </span>
                    <span className="shrink-0 text-muted">{formatHours(segment.minutes)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
