import type { CalendarItem, CaptureExtraction, Responsibility, SavedList, Task } from "@/lib/types/domain";

// Starter data for a brand-new account. Real data lives in Supabase;
// these arrays are only used before first login / as first-login seeds.
export const responsibilities: Responsibility[] = [
  {
    id: "personal",
    name: "Life",
    description: "Life admin, personal, errands, planning, and personal routines.",
    color: "sage",
    icon: "User",
    weeklyGoalHours: 6,
    actualHoursThisWeek: 0,
    plannedHoursThisWeek: 0,
    taskCount: 0,
    upcomingCount: 0
  }
];

export const calendarItems: CalendarItem[] = [];

export const lists: SavedList[] = [];

export const tasks: Task[] = [];

export const aiReviewItems: CaptureExtraction[] = [];
