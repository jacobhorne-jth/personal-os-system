"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { expandCalendarItems } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import type { CalendarItem } from "@/lib/types/domain";
import { responsibilityTone } from "@/lib/theme";
import { cn, minutesBetween } from "@/lib/utils";

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;
const ROW_HEIGHT = 60;

function itemPosition(item: CalendarItem, startHour: number, totalMinutes: number) {
  const start = new Date(item.startsAt);
  const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
  const duration = Math.max(minutesBetween(item.startsAt, item.endsAt), 20);
  return {
    top: `${(startMinutes / totalMinutes) * 100}%`,
    height: `${(duration / totalMinutes) * 100}%`
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

export function DayTimeline({ filteredResponsibilityId, date }: { filteredResponsibilityId?: string; date?: string }) {
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
    const earliestHour = items.length
      ? Math.min(...items.map((item) => new Date(item.startsAt).getHours()))
      : DEFAULT_START_HOUR;
    const latestHour = items.length
      ? Math.max(...items.map((item) => Math.ceil((new Date(item.endsAt).getHours() * 60 + new Date(item.endsAt).getMinutes()) / 60)))
      : DEFAULT_END_HOUR;
    const rangeStart = Math.min(DEFAULT_START_HOUR, earliestHour);
    const rangeEnd = Math.max(DEFAULT_END_HOUR, latestHour);
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

    scrollRef.current.scrollTop = Math.max(0, (DEFAULT_START_HOUR - startHour) * ROW_HEIGHT);
  }, [startHour]);

  return (
    <div ref={scrollRef} className="relative max-h-[660px] overflow-y-auto rounded-lg border border-line bg-[#111112]">
      <div className="grid grid-cols-[58px_1fr]" style={{ height: contentHeight }}>
        <div className="border-r border-line bg-[#1b1b1b]">
          {hours.map((hour) => (
            <div key={hour} className="h-14 pr-2 pt-1 text-right text-[10px] font-medium text-muted">
              {hourLabel(hour)}
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="h-14 border-b border-line" />
          ))}
          <div className="absolute inset-0">
            {items.map((item) => {
              const responsibility = responsibilities.find((entry) => entry.id === item.responsibilityId);
              const color = responsibility?.color ?? "blue";
              const compact = minutesBetween(item.startsAt, item.endsAt) <= 30;
              return (
                <Link
                  href={`/event/${item.id}`}
                  key={item.id}
                  className={cn(
                    "group absolute left-2 right-3 overflow-hidden rounded-md border-0 px-3 text-xs transition duration-200 hover:brightness-110 sm:left-4 sm:right-5",
                    compact ? "flex min-h-7 items-center py-1" : "py-2",
                    responsibilityTone[color].fill
                  )}
                  style={itemPosition(item, startHour, totalMinutes)}
                >
                  <div className={cn("relative min-w-0", compact && "w-full")}>
                    <div className={cn("min-w-0", compact && "flex items-center gap-2")}>
                      <span className="block truncate font-semibold text-white">{item.title}</span>
                      {item.location && (
                        <span className={cn("block truncate text-[11px] text-white/90", compact ? "min-w-0 before:mr-2 before:content-['·']" : "mt-0.5")}>
                          {item.location}
                        </span>
                      )}
                    </div>
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
