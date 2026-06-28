export type ResponsibilityColor =
  | "tomato"
  | "tangerine"
  | "banana"
  | "mango"
  | "pumpkin"
  | "lemon"
  | "lime"
  | "sage"
  | "basil"
  | "emerald"
  | "teal"
  | "cyan"
  | "peacock"
  | "sky"
  | "cobalt"
  | "blueberry"
  | "indigo"
  | "periwinkle"
  | "lavender"
  | "lilac"
  | "grape"
  | "orchid"
  | "magenta"
  | "pink"
  | "rose"
  | "flamingo"
  | "cherry"
  | "graphite"
  | "slate"
  | "stone"
  | "blue"
  | "mint"
  | "coral"
  | "amber"
  | "violet";

export type Responsibility = {
  id: string;
  name: string;
  description: string;
  color: ResponsibilityColor;
  icon: string;
  weeklyGoalHours: number;
  actualHoursThisWeek: number;
  plannedHoursThisWeek: number;
  taskCount: number;
  upcomingCount: number;
};

export type CalendarItemType =
  | "external_event"
  | "app_event"
  | "task_due"
  | "deadline"
  | "time_block"
  | "time_log"
  | "reminder";

export type CalendarItem = {
  id: string;
  title: string;
  type: CalendarItemType;
  responsibilityId: string;
  startsAt: string;
  endsAt: string;
  source?: "app" | "ai_review";
  location?: string;
  notes?: string;
};

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = {
  id: string;
  title: string;
  description?: string;
  responsibilityId?: string;
  dueAt?: string;
  priority: TaskPriority;
  status: "todo" | "doing" | "done";
  labels?: string[];
  estimateMinutes?: number;
  subtasks: { id: string; title: string; done: boolean }[];
};

export type CaptureExtraction = {
  id: string;
  source: "typed" | "voice" | "upload" | "paste";
  summary: string;
  confidence: number;
  status?: "pending_review" | "approved" | "rejected" | "partially_approved";
  decisions?: Record<string, boolean>;
  proposedTasks: Pick<Task, "title" | "priority" | "responsibilityId" | "dueAt">[];
  proposedEvents: Pick<CalendarItem, "title" | "type" | "responsibilityId" | "startsAt" | "endsAt">[];
  proposedNotes: { title: string; body: string; responsibilityId: string }[];
  proposedListItems?: { listTitle: string; itemTitle: string; responsibilityId: string }[];
};

export type Note = {
  id: string;
  title: string;
  body: string;
  responsibilityId: string;
  labels?: string[];
  createdAt: string;
  updatedAt?: string;
};

export type FileAsset = {
  id: string;
  filename: string;
  mimeType: string;
  sizeLabel: string;
  responsibilityId: string;
  createdAt: string;
};

export type SavedList = {
  id: string;
  title: string;
  responsibilityId: string;
  items: { id: string; title: string; done: boolean }[];
  updatedAt: string;
};
