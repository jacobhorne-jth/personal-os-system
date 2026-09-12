import { FullCalendarBoard } from "@/components/calendar/full-calendar-board";
import { CalendarSidebar } from "@/components/layout/calendar-sidebar";

export default function CalendarPage() {
  return (
    <div className="flex h-full min-h-0 bg-calendar">
      <main className="h-full min-w-0 flex-1">
        <FullCalendarBoard fullChrome />
      </main>
      <CalendarSidebar />
    </div>
  );
}
