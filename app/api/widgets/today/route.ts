import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/queries/dashboard";

export async function GET() {
  const snapshot = getDashboardSnapshot();

  return NextResponse.json({
    date: "2026-05-07",
    stats: snapshot.todayStats,
    nextEvents: snapshot.calendarItems.slice(0, 3),
    dueTasks: snapshot.tasks.slice(0, 5),
    timeByResponsibility: snapshot.responsibilities.map((item) => ({
      id: item.id,
      name: item.name,
      actualHours: item.actualHoursThisWeek,
      plannedHours: item.plannedHoursThisWeek
    }))
  });
}
