"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { expandCalendarItems } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import type { CalendarItem } from "@/lib/types/domain";
import { getTone } from "@/lib/theme";
import { cn, formatTime, minutesBetween } from "@/lib/utils";

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const INITIAL_SCROLL_HOUR = 7;
const ROW_HEIGHT = 60;

function itemPosition(item: CalendarItem, startHour: number, totalMinutes: number) {
  const start = new Date(item.startsAt);
  const startMinutes = Math.max(0, (start.getHours() - startHour) * 60 + start.getMinutes());
  const duration = Math.max(minutesBetween(item.startsAt, item.endsAt), 20);
  const visibleDuration = Math.min(duration, totalMinutes - startMinutes);
  return {
    top: `${(startMinutes / totalMinutes) * 100}%`,
    height: `${(visibleDuration / totalMinutes) * 100}%`
  };
}

function hourLabel(hour: number) {
  const normalized = hour % 24;
  if (normalized === 0) {
    return "12 AM";
  }
  if (normalized === 12) {
    return "12 PM";
  }
  return normalized > 12 ? `${normalized - 12} PM` : `${normalized} AM`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function DayTimeline({ filteredResponsibilityId, date, className }: { filteredResponsibilityId?: string; date?: string; className?: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const dayKey = date ?? todayKey();
  const dayStart = new Date(`${dayKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const items = expandCalendarItems(calendarItems, dayStart, dayEnd).filter(
    (item) => item.startsAt.startsWith(dayKey) && (!filteredResponsibilityId || item.responsibilityId === filteredResponsibilityId)
  );
  const { hours, startHour, totalMinutes, contentHeight } = useMemo(() => {
    const rangeStart = DAY_START_HOUR;
    const rangeEnd = DAY_END_HOUR;
    const hourCount = rangeEnd - rangeStart;

    return {
      startHour: rangeStart,
      totalMinutes: hourCount * 60,
      contentHeight: hourCount * ROW_HEIGHT,
      hours: Array.from({ length: hourCount }, (_, index) => rangeStart + index)
    };
  }, [items]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = Math.max(0, (INITIAL_SCROLL_HOUR - startHour) * ROW_HEIGHT);
  }, [startHour]);

  return (
    <div ref={scrollRef} className={cn("relative max-h-[660px] overflow-y-auto rounded-xl border border-line bg-panel shadow-glow", className)}>
      <div className="grid grid-cols-[58px_1fr]" style={{ height: contentHeight }}>
        <div className="border-r border-line bg-paper">
          {hours.map((hour) => (
            <div key={hour} className="pr-2 pt-1 text-right text-[10px] font-medium text-muted" style={{ height: ROW_HEIGHT }}>
              {hourLabel(hour)}
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="border-b border-line" style={{ height: ROW_HEIGHT }} />
          ))}
          <div className="absolute inset-0">
            {items.map((item) => {
              const responsibility = responsibilities.find((entry) => entry.id === item.responsibilityId);
              const color = responsibility?.color ?? "blue";
              const duration = minutesBetween(item.startsAt, item.endsAt);
              const tiny = duration <= 20;
              const compact = !tiny && duration <= 45;
              const roomy = duration >= 75;
              const startTime = formatTime(item.startsAt);
              const timeRange = `${startTime} - ${formatTime(item.endsAt)}`;
              return (
                <Link
                  href={`/event/${item.id}`}
                  key={item.id}
                  className={cn(
                    "home-day-event group absolute left-2 right-3 overflow-hidden rounded-md text-xs leading-tight transition duration-200 hover:brightness-110 sm:left-4 sm:right-5",
                    tiny && "home-day-event-tiny",
                    compact && "home-day-event-compact"
                  )}
                  style={{ ...itemPosition(item, startHour, totalMinutes), "--home-day-event-color": getTone(color).hex } as CSSProperties}
                >
                  <div className={cn("home-day-event-card", tiny && "home-day-event-card-tiny", compact && "home-day-event-card-compact")}>
                    <span className="home-day-event-title">{item.title}</span>
                    <span className="home-day-event-time">{tiny ? `, ${startTime}` : timeRange}</span>
                    {roomy && item.location && <span className="home-day-event-location">{item.location}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
