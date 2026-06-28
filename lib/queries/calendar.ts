import type { CalendarItem } from "@/lib/types/domain";

export type CalendarOverlay = {
  type: CalendarItem["type"];
  label: string;
  enabledByDefault: boolean;
};

export const calendarOverlays: CalendarOverlay[] = [
  { type: "app_event", label: "Events", enabledByDefault: true },
  { type: "task_due", label: "Tasks", enabledByDefault: true },
  { type: "deadline", label: "Deadlines", enabledByDefault: true },
  { type: "time_block", label: "Blocks", enabledByDefault: true },
  { type: "time_log", label: "Logs", enabledByDefault: true },
  { type: "reminder", label: "Reminders", enabledByDefault: false }
];

export function toFullCalendarEvent(item: CalendarItem) {
  return {
    id: item.id,
    title: item.title,
    start: item.startsAt,
    end: item.endsAt,
    extendedProps: {
      type: item.type,
      responsibilityId: item.responsibilityId,
      source: item.source,
      location: item.location
    }
  };
}
