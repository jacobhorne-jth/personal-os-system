"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { localDateKey } from "@/lib/dates";
import { expandCalendarItems } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import type { CalendarItem } from "@/lib/types/domain";
import { cn, formatTime } from "@/lib/utils";

const ROW_HEIGHT = 52;
const TOTAL_MINUTES = 24 * 60;
const MIN_BLOCK_MINUTES = 20;
const SNAP_MINUTES = 30;
const AXIS_WIDTH = 52;

type TimelineItemLayout = {
  item: CalendarItem;
  lane: number;
  lanes: number;
  startMinutes: number;
  endMinutes: number;
};

// Midnight-to-midnight (or 23:55+) items render in the all-day strip
export function isAllDayItem(item: CalendarItem) {
  const start = new Date(item.startsAt);
  const end = new Date(item.endsAt);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0;
  const endsAtDayEnd = end.getHours() === 23 && end.getMinutes() >= 55;
  const endsAtNextMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getDate() !== start.getDate();
  return startsAtMidnight && (endsAtDayEnd || endsAtNextMidnight || durationMinutes >= 23 * 60);
}

export function useNowMinutes() {
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    };
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return minutes;
}

function clampMinutes(value: number) {
  return Math.max(0, Math.min(TOTAL_MINUTES, value));
}

function layoutItems(items: CalendarItem[], dayStart: Date): TimelineItemLayout[] {
  const sorted = items
    .map((item) => {
      const rawStart = Math.round((new Date(item.startsAt).getTime() - dayStart.getTime()) / 60000);
      const rawEnd = Math.round((new Date(item.endsAt).getTime() - dayStart.getTime()) / 60000);
      const startMinutes = Math.min(clampMinutes(rawStart), TOTAL_MINUTES - MIN_BLOCK_MINUTES);
      const endMinutes = Math.min(TOTAL_MINUTES, Math.max(startMinutes + MIN_BLOCK_MINUTES, clampMinutes(rawEnd)));
      return { item, startMinutes, endMinutes };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes || a.item.title.localeCompare(b.item.title));

  const layouts: TimelineItemLayout[] = [];
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
    layouts.push(...clusterLayouts.map((layout) => ({ ...layout, lanes })));
    cluster = [];
    clusterEnd = -1;
  }

  for (const entry of sorted) {
    if (cluster.length && entry.startMinutes >= clusterEnd) flushCluster();
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.endMinutes);
  }
  flushCluster();
  return layouts;
}

function hourLabel(hour: number) {
  if (hour === 0) return "";
  if (hour === 12) return "Noon";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function minutesLabel(minutes: number) {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function DayTimeline({
  date,
  filteredResponsibilityId,
  className,
  allowCreate = false,
}: {
  date?: string;
  filteredResponsibilityId?: string;
  className?: string;
  allowCreate?: boolean;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const dayKey = date ?? localDateKey();
  const isToday = dayKey === localDateKey();
  const nowMinutes = useNowMinutes();
  const [ghostMinutes, setGhostMinutes] = useState<number | null>(null);

  const dayStart = useMemo(() => new Date(`${dayKey}T00:00:00`), [dayKey]);
  const { timed, allDay } = useMemo(() => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const items = expandCalendarItems(calendarItems, dayStart, dayEnd).filter(
      (item) =>
        item.type !== "task_due" &&
        new Date(item.startsAt) < dayEnd &&
        new Date(item.endsAt) > dayStart &&
        (!filteredResponsibilityId || item.responsibilityId === filteredResponsibilityId)
    );
    return { timed: items.filter((item) => !isAllDayItem(item)), allDay: items.filter(isAllDayItem) };
  }, [calendarItems, dayStart, filteredResponsibilityId]);
  const layouts = useMemo(() => layoutItems(timed, dayStart), [timed, dayStart]);

  const colorFor = (responsibilityId: string) =>
    getTone(responsibilities.find((entry) => entry.id === responsibilityId)?.color ?? "blue").hex;

  // Land on "now" for today, otherwise just before the first event
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstStart = layouts.length ? Math.min(...layouts.map((layout) => layout.startMinutes)) : 8 * 60;
    const target = isToday ? nowMinutes - 90 : firstStart - 45;
    el.scrollTop = Math.max(0, (target / 60) * ROW_HEIGHT);
    // Only re-anchor when the day changes, not on every data/clock tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  function minutesFromPointer(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = ((event.clientY - rect.top) / ROW_HEIGHT) * 60;
    return Math.max(0, Math.min(TOTAL_MINUTES - SNAP_MINUTES, Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES));
  }

  function createAt(minutes: number) {
    const start = new Date(dayStart);
    start.setMinutes(minutes);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const startIso = encodeURIComponent(start.toISOString());
    router.push(`/calendar?start=${startIso}&end=${encodeURIComponent(end.toISOString())}&date=${startIso}`);
  }

  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {allDay.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-line py-2 pr-3" style={{ paddingLeft: AXIS_WIDTH }}>
          {allDay.map((item) => (
            <Link
              key={item.id}
              href={`/event/${item.id}`}
              className="ev-block max-w-full truncate rounded-md py-0.5 pl-2.5 pr-2 text-xs font-medium"
              style={{ "--gcal-event-color": colorFor(item.responsibilityId) } as CSSProperties}
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative" style={{ height: 24 * ROW_HEIGHT + 12 }}>
          {hours.map((hour) => (
            <div key={hour} className="pointer-events-none absolute inset-x-0" style={{ top: hour * ROW_HEIGHT + 6 }}>
              <span
                className="absolute -translate-y-1/2 pr-2.5 text-right text-[11px] font-medium tabular-nums text-subtle"
                style={{ width: AXIS_WIDTH }}
              >
                {isToday && Math.abs(hour * 60 - nowMinutes) < 16 ? "" : hourLabel(hour)}
              </span>
              {hour > 0 && (
                <span className="absolute right-0 h-px bg-[rgb(var(--color-calendar-grid))]" style={{ left: AXIS_WIDTH - 6 }} />
              )}
            </div>
          ))}

          <div
            className={cn("absolute bottom-[6px] right-2 top-[6px]", allowCreate && "cursor-pointer")}
            style={{ left: AXIS_WIDTH }}
            onMouseMove={(event) => {
              if (!allowCreate) return;
              if ((event.target as HTMLElement).closest("a")) {
                setGhostMinutes(null);
                return;
              }
              setGhostMinutes(minutesFromPointer(event));
            }}
            onMouseLeave={() => setGhostMinutes(null)}
            onClick={(event) => {
              if (!allowCreate || (event.target as HTMLElement).closest("a")) return;
              createAt(minutesFromPointer(event));
            }}
          >
            {ghostMinutes !== null && (
              <div
                className="pointer-events-none absolute inset-x-0.5 rounded-md border border-dashed border-subtle/50 bg-hover/60 px-2 py-1 text-[11px] font-medium text-muted"
                style={{ top: (ghostMinutes / 60) * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                + {minutesLabel(ghostMinutes)}
              </div>
            )}

            {layouts.map((layout) => {
              const { item } = layout;
              const duration = layout.endMinutes - layout.startMinutes;
              const short = duration <= 40;
              const roomy = duration >= 75 && layout.lanes <= 2;
              const startTime = formatTime(item.startsAt);
              const timeRange = `${startTime} – ${formatTime(item.endsAt)}`;
              const laneWidth = 100 / layout.lanes;
              const style = {
                top: (layout.startMinutes / 60) * ROW_HEIGHT,
                height: Math.max(18, (duration / 60) * ROW_HEIGHT - 2),
                left: `calc(${laneWidth * layout.lane}% + 2px)`,
                width: `calc(${laneWidth}% - 4px)`,
                "--gcal-event-color": colorFor(item.responsibilityId),
              } as CSSProperties;
              const past = isToday && layout.endMinutes <= nowMinutes;
              return (
                <Link
                  key={item.id}
                  href={`/event/${item.id}`}
                  title={[item.title, timeRange, item.location].filter(Boolean).join("\n")}
                  className={cn("ev-block absolute", layout.lanes > 1 && "ev-block-overlap", past && "opacity-60")}
                  style={style}
                >
                  <div className={cn("ev-card", short && "ev-card-row")}>
                    <span className="ev-title">{item.title || "Untitled"}</span>
                    {short ? (
                      <span className="ev-time">{startTime}</span>
                    ) : (
                      <span className="ev-time">
                        <span className="time-full">{timeRange}</span>
                        <span className="time-short">{startTime}</span>
                      </span>
                    )}
                    {roomy && item.location && <span className="ev-location">{item.location}</span>}
                  </div>
                </Link>
              );
            })}

            {isToday && (
              <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (nowMinutes / 60) * ROW_HEIGHT }}>
                <span
                  className="absolute -translate-y-1/2 bg-panel pr-2 text-right text-[11px] font-semibold tabular-nums text-now"
                  style={{ left: -AXIS_WIDTH, width: AXIS_WIDTH - 4 }}
                >
                  {minutesLabel(nowMinutes).replace(/\s?[AP]M$/, "")}
                </span>
                <div className="relative h-[1.5px] bg-now">
                  <span className="absolute -left-1 -top-[3.25px] size-2 rounded-full bg-now" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
