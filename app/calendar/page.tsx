import { FullCalendarBoard } from "@/components/calendar/full-calendar-board";
import { CalendarSidebar } from "@/components/layout/calendar-sidebar";

export default function CalendarPage() {
  return (
    <div className="grid h-full min-h-0 bg-paper xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="min-w-0">
        <div className="h-dvh lg:h-screen">
          <FullCalendarBoard fullChrome />
        </div>
      </main>
      <CalendarSidebar />
    </div>
  );
}
