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
  source?: "app" | "ai_review" | "google";
  externalId?: string;
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
  recurrence?: string;
  subtasks: { id: string; title: string; done: boolean }[];
};

export type CaptureExtraction = {
  id: string;
  source: "typed" | "voice" | "upload" | "paste" | "time_log";
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
  folderId?: string;
  labels?: string[];
  createdAt: string;
  updatedAt?: string;
  lastOpenedAt?: string;
};

export type NoteFolder = {
  id: string;
  name: string;
  color: ResponsibilityColor;
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

// "daily"  → do it N times per day (target=N); cell shows 0/N → 1/N → ... → N/N
// "weekly" → do it N times per week (target=N); each day cell toggles done/not-done
// "avoid"  → don't do it; each day cell toggles failed (red) / clean (green)
// "limit"  → do it at most N times per day; cell tracks count, turns red when exceeded
export type HabitType = "daily" | "weekly" | "avoid" | "limit";

export type Habit = {
  id: string;
  title: string;
  type: HabitType;
  target: number;       // times per day (daily), times per week (weekly), ignored for avoid
  unit?: string;        // display label, e.g. "oz", "pages", "times"
  responsibilityId?: string;
  createdAt: string;
};

export type HabitLog = {
  habitId: string;
  date: string;   // YYYY-MM-DD
  value: number;  // daily: completion count (0..target); weekly/avoid: 0 or 1
};

// ─── Goals ───────────────────────────────────────────────────────────────────

export type Goal = {
  id: string;
  title: string;
  responsibilityId?: string;
  current: number;
  target: number;
  unit: string;
  deadline?: string; // YYYY-MM-DD
  status: "active" | "paused" | "done";
  createdAt: string;
};

// ─── Food ─────────────────────────────────────────────────────────────────────

export type FoodMeal = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  meal: FoodMeal;
  calories: number;
  protein: number;
};

// ─── Ideas ───────────────────────────────────────────────────────────────────

export type IdeaStatus = "raw" | "considering" | "active" | "paused";

export type Idea = {
  id: string;
  title: string;
  notes?: string;
  responsibilityId?: string;
  status: IdeaStatus;
  createdAt: string;
};

// ─── Gym ─────────────────────────────────────────────────────────────────────

export type GymExercise = {
  id: string;
  name: string;
  muscleGroup?: string;
  defaultSets: number;
  defaultReps: number;
  lastWeight: number;  // always stored in lbs
};

export type GymDay = {
  dayIndex: number;    // 0=Mon … 6=Sun
  label: string;       // "Push" | "Pull" | "Legs" | "Abs"
  exerciseIds: string[];
};

export type GymSet = {
  weight: number;  // lbs
  reps: number;
  done: boolean;
};

export type GymSessionExercise = {
  exerciseId: string;
  sets: GymSet[];
};

export type ActiveGymSession = {
  date: string;         // YYYY-MM-DD
  dayLabel: string;
  startedAt: string;    // ISO timestamp
  exercises: GymSessionExercise[];
};

export type GymSession = {
  id: string;
  date: string;
  dayLabel: string;
  startedAt: string;
  completedAt: string;
  exercises: GymSessionExercise[];
};
