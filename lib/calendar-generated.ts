import type { CalendarItem } from "@/lib/types/domain";

export const capitalOneSeriesId = "capital-one-work";

const easternTimeZone = "America/New_York";

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = `${Math.floor(absolute / 60)}`.padStart(2, "0");
  const mins = `${absolute % 60}`.padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

function offsetMinutesForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

function easternIsoForLocalDate(date: Date, hour: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let utcGuess = Date.UTC(year, month - 1, day, hour, 0, 0);
  let offset = offsetMinutesForTimeZone(new Date(utcGuess), easternTimeZone);
  utcGuess = Date.UTC(year, month - 1, day, hour, 0, 0) - offset * 60_000;
  offset = offsetMinutesForTimeZone(new Date(utcGuess), easternTimeZone);
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}T${`${hour}`.padStart(2, "0")}:00:00${formatOffset(offset)}`;
}

export function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function capitalOneWorkBlocks(today = new Date()): CalendarItem[] {
  const weekStart = startOfWeek(today);
  return Array.from({ length: 17 }).flatMap((_, weekIndex) =>
    [1, 2, 3, 4, 5].map((dayOffset) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + (weekIndex - 4) * 7 + dayOffset);
      return {
        id: `${capitalOneSeriesId}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        title: "Capital One Work",
        type: "time_block",
        responsibilityId: "capital-one",
        startsAt: easternIsoForLocalDate(date, 9),
        endsAt: easternIsoForLocalDate(date, 17),
        source: "app",
        location: "Remote"
      };
    })
  );
}

export function filterGeneratedCalendarItems(
  items: CalendarItem[],
  hiddenIds: string[],
  hiddenSeries: Record<string, { all?: boolean; followingStart?: string }>
) {
  const seriesRule = hiddenSeries[capitalOneSeriesId];
  if (seriesRule?.all) return [];

  return items.filter((item) => {
    if (hiddenIds.includes(item.id)) return false;
    if (seriesRule?.followingStart && item.startsAt >= seriesRule.followingStart) return false;
    return true;
  });
}
