import { FullCalendarBoard } from "@/components/calendar/full-calendar-board";
import { CalendarSidebar } from "@/components/layout/calendar-sidebar";

export default function CalendarPage() {
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <CalendarSidebar />
      <main className="min-w-0 flex-1">
        <div className="h-dvh">
          <FullCalendarBoard fullChrome />
        </div>
      </main>
    </div>
  );
}
