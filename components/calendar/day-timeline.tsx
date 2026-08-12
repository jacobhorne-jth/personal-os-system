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

type TimelineItemLayout = {
  item: CalendarItem;
  lane: number;
  lanes: number;
  startMinutes: number;
  endMinutes: number;
};

function itemMinutes(item: CalendarItem, startHour: number, totalMinutes: number) {
  const start = new Date(item.startsAt);
  const rawStart = (start.getHours() - startHour) * 60 + start.getMinutes();
  const startMinutes = Math.max(0, Math.min(totalMinutes, rawStart));
  const duration = Math.max(minutesBetween(item.startsAt, item.endsAt), 20);
  const endMinutes = Math.max(startMinutes + 20, Math.min(totalMinutes, startMinutes + duration));
  return { startMinutes, endMinutes };
}

function layoutItems(items: CalendarItem[], startHour: number, totalMinutes: number): TimelineItemLayout[] {
  const sorted = items
    .map((item) => ({ item, ...itemMinutes(item, startHour, totalMinutes) }))
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes || a.item.title.localeCompare(b.item.title));

  const layouts = new Map<string, TimelineItemLayout>();
  let cluster: typeof sorted = [];
  let clusterEnd = -1;

  function flushCluster() {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    const clusterLayouts: TimelineItemLayout[] = [];

    for (const entry of cluster) {
      let lane = laneEnds.findIndex((end) => end <= entry.startMinutes);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(entry.endMinutes);
      } else {
        laneEnds[lane] = entry.endMinutes;
      }
      clusterLayouts.push({ ...entry, lane, lanes: 1 });
    }

    const lanes = Math.max(1, laneEnds.length);
    for (const layout of clusterLayouts) {
      layouts.set(layout.item.id, { ...layout, lanes });
    }
    cluster = [];
    clusterEnd = -1;
  }

  for (const entry of sorted) {
    if (cluster.length && entry.startMinutes >= clusterEnd) {
      flushCluster();
    }
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.endMinutes);
  }
  flushCluster();

  return items.map((item) => layouts.get(item.id)).filter((layout): layout is TimelineItemLayout => Boolean(layout));
}

function itemStyle(layout: TimelineItemLayout, totalMinutes: number) {
  const top = `${(layout.startMinutes / totalMinutes) * 100}%`;
  const height = `${((layout.endMinutes - layout.startMinutes) / totalMinutes) * 100}%`;
  const laneWidth = 100 / layout.lanes;
  const leftPercent = laneWidth * layout.lane;
  const rightPercent = laneWidth * (layout.lanes - layout.lane - 1);
  const leftGutter = layout.lane === 0 ? 16 : 3;
  const rightGutter = layout.lane === layout.lanes - 1 ? 20 : 3;

  return {
    top,
    height,
    left: `calc(${leftPercent}% + ${leftGutter}px)`,
    right: `calc(${rightPercent}% + ${rightGutter}px)`
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
  }, []);
  const laidOutItems = useMemo(() => layoutItems(items, startHour, totalMinutes), [items, startHour, totalMinutes]);

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
            {laidOutItems.map((layout) => {
              const responsibility = responsibilities.find((entry) => entry.id === layout.item.responsibilityId);
              const color = responsibility?.color ?? "blue";
              const duration = layout.endMinutes - layout.startMinutes;
              const tiny = duration <= 20;
              const compact = !tiny && duration <= 45;
              const roomy = duration >= 75 && layout.lanes <= 2;
              const startTime = formatTime(layout.item.startsAt);
              const timeRange = `${startTime} - ${formatTime(layout.item.endsAt)}`;
              return (
                <Link
                  href={`/event/${layout.item.id}`}
                  key={layout.item.id}
                  title={[layout.item.title, timeRange, layout.item.location].filter(Boolean).join("\n")}
                  className={cn(
                    "home-day-event group absolute overflow-hidden rounded-md text-xs leading-tight transition duration-200 hover:brightness-110",
                    tiny && "home-day-event-tiny",
                    compact && "home-day-event-compact",
                    layout.lanes > 1 && "home-day-event-overlap"
                  )}
                  style={{ ...itemStyle(layout, totalMinutes), "--home-day-event-color": getTone(color).hex } as CSSProperties}
                >
                  <div className={cn("home-day-event-card", tiny && "home-day-event-card-tiny", compact && "home-day-event-card-compact")}>
                    <span className="home-day-event-title">{layout.item.title}</span>
                    <span className="home-day-event-time">{tiny ? `, ${startTime}` : timeRange}</span>
                    {roomy && layout.item.location && <span className="home-day-event-location">{layout.item.location}</span>}
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
