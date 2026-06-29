"use client";

import { useMemo } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { capitalOneWorkBlocks, filterGeneratedCalendarItems, startOfWeek } from "@/lib/calendar-generated";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { responsibilityTone } from "@/lib/theme";
import type { CalendarItem } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function miniMonthDays(today = new Date()) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString(),
      day: date.getDate(),
      inMonth: date.getMonth() === today.getMonth(),
      isToday: date.toDateString() === today.toDateString()
    };
  });
}

function weekRangeLabel(today: Date) {
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const endMonth = end.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
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

export function CalendarSidebar() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const hiddenCalendarEventIds = useAppStore((state) => state.hiddenCalendarEventIds);
  const hiddenCalendarSeries = useAppStore((state) => state.hiddenCalendarSeries);
  const { hiddenResponsibilities, toggleResponsibility } = useUiStore();
  const today = useMemo(() => new Date(), []);
  const monthDays = useMemo(() => miniMonthDays(today), [today]);
  const weekStart = useMemo(() => startOfWeek(today), [today]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 7);
    return end;
  }, [weekStart]);
  const weeklyInsights = useMemo(() => {
    const visibleGeneratedItems = filterGeneratedCalendarItems(capitalOneWorkBlocks(today), hiddenCalendarEventIds, hiddenCalendarSeries);
    const allItems = [...visibleGeneratedItems, ...calendarItems].filter((item) => !hiddenResponsibilities.includes(item.responsibilityId));
    const minutesByResponsibility = allItems.reduce<Record<string, number>>((current, item) => {
      const minutes = overlapMinutes(item, weekStart, weekEnd);
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
        color: responsibilityTone[responsibility.color].hex
      }))
      .filter((item) => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    const totalMinutes = segments.reduce((sum, item) => sum + item.minutes, 0);
    return { segments, totalMinutes };
  }, [calendarItems, hiddenCalendarEventIds, hiddenCalendarSeries, hiddenResponsibilities, responsibilities, today, weekEnd, weekStart]);

  return (
    <aside className="hidden min-h-0 w-[360px] shrink-0 flex-col border-l border-[#303134] bg-[#1f1f1f] [--panel-inset:18px] py-4 xl:flex">
      <div className="mb-5 px-[var(--panel-inset)]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-[#e8eaed]">{today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          <div className="flex gap-0">
            <button
              className="grid size-8 place-items-center rounded-full text-[#9aa0a6] transition hover:bg-[#3c4043]"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="grid size-8 place-items-center rounded-full text-[#9aa0a6] transition hover:bg-[#3c4043]"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {DAYS.map((d, i) => (
            <div key={i} className="flex h-8 items-center justify-center text-[11px] font-medium text-[#9aa0a6]">
              {d}
            </div>
          ))}
          {monthDays.map((date) => {
            return (
              <button
                key={date.key}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs transition mx-auto",
                  date.isToday ? "bg-[#4285f4] font-medium text-white" : "",
                  !date.isToday && date.inMonth ? "text-[#e8eaed] hover:bg-[#3c4043]" : "",
                  !date.isToday && !date.inMonth ? "text-[#5f6368] hover:bg-[#3c4043]" : ""
                )}
              >
                {date.day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-[var(--panel-inset)] mb-4 h-px bg-[#3c4043]" />

      <div className="flex-1 overflow-y-auto px-[var(--panel-inset)]">
        <p className="mb-2 text-xs font-medium text-[#9aa0a6]">Responsibilities</p>
        {responsibilities.map((item) => {
          const tone = responsibilityTone[item.color];
          const hidden = hiddenResponsibilities.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleResponsibility(item.id)}
              className="-mx-3 flex w-[calc(100%+24px)] items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm transition hover:bg-[#3c4043]"
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
              <span className={cn("flex-1 truncate text-sm", hidden ? "text-[#5f6368]" : "text-[#e8eaed]")}>
                {item.name}
              </span>
            </button>
          );
        })}

        <div className="my-5 h-px bg-[#3c4043]" />

        <section>
          <div className="mb-3 flex h-11 items-center justify-between rounded-full bg-[#282a2d] px-4">
            <h2 className="text-base font-semibold text-[#e8eaed]">Time Insights</h2>
            <ChevronDown className="size-5 rotate-180 text-[#e8eaed]" />
          </div>
          <p className="px-4 text-sm font-semibold tracking-[0.12em] text-[#e8eaed]">{weekRangeLabel(today)}</p>
          <div className="mx-4 mt-4 flex h-4 overflow-hidden rounded-full bg-[#3c4043]">
            {weeklyInsights.totalMinutes > 0 ? (
              weeklyInsights.segments.map((segment) => (
                <div
                  key={segment.id}
                  title={`${segment.name}: ${formatHours(segment.minutes)}`}
                  style={{
                    width: `${(segment.minutes / weeklyInsights.totalMinutes) * 100}%`,
                    backgroundColor: segment.color
                  }}
                />
              ))
            ) : (
              <div className="h-full w-full bg-[#5f6368]" />
            )}
          </div>
          <div className="mt-4 space-y-2 px-4">
            {weeklyInsights.segments.slice(0, 6).map((segment) => (
              <div key={segment.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-[#e8eaed]">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate">{segment.name}</span>
                </span>
                <span className="shrink-0 text-[#9aa0a6]">{formatHours(segment.minutes)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
