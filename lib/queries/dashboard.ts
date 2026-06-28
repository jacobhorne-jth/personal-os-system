import { aiReviewItems, calendarItems, responsibilities, tasks } from "@/lib/data/mock";

export function getDashboardSnapshot() {
  return {
    responsibilities,
    calendarItems,
    tasks,
    aiReviewItems,
    todayStats: {
      eventsToday: calendarItems.filter((item) => item.type === "external_event" || item.type === "app_event").length,
      tasksDue: tasks.filter((task) => task.status !== "done").length
    }
  };
}

export function getResponsibilitySnapshot(responsibilityId: string) {
  const responsibility = responsibilities.find((item) => item.id === responsibilityId);

  return {
    responsibility,
    calendarItems: calendarItems.filter((item) => item.responsibilityId === responsibilityId),
    tasks: tasks.filter((task) => task.responsibilityId === responsibilityId),
    timeLogs: calendarItems.filter((item) => item.responsibilityId === responsibilityId && item.type === "time_log")
  };
}
