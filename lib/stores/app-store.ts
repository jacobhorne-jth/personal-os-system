"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiReviewItems, calendarItems, lists, responsibilities, tasks } from "@/lib/data/mock";
import { nextOccurrence } from "@/lib/recurrence";
import type { ActiveGymSession, CalendarItem, CaptureExtraction, FileAsset, FoodEntry, FoodMeal, Goal, GymDay, GymExercise, GymSession, GymSessionExercise, GymSet, Habit, HabitLog, HabitType, Idea, IdeaStatus, Note, NoteFolder, Responsibility, ResponsibilityColor, SavedFood, SavedList, Task } from "@/lib/types/domain";
import type { Database, Json } from "@/lib/types/database";

// ─── Supabase client singleton ────────────────────────────────────────────────

let _db: SupabaseClient<Database> | null = null;

function getDb(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!_db) _db = createBrowserClient<Database>(url, key);
  return _db;
}

// ─── Cross-device slice sync ──────────────────────────────────────────────────
// These slices have no dedicated tables; they sync as one JSONB document in
// app_state so phone and laptop share habits, gym, goals, food, and ideas.

const LOCAL_SLICE_KEYS = [
  "habits",
  "habitLogs",
  "gymExercises",
  "gymDays",
  "gymSessions",
  "activeGymSession",
  "gymWeightUnit",
  "goals",
  "foodEntries",
  "foodTargets",
  "savedFoods",
  "ideas",
] as const;

let applyingServerSlices = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localSlices(state: any): Record<string, unknown> {
  return Object.fromEntries(LOCAL_SLICE_KEYS.map((k) => [k, state[k]]));
}

// ─── DB → Domain mappers ──────────────────────────────────────────────────────

type DbTask = Database["public"]["Tables"]["tasks"]["Row"];
type DbCalendarItem = Database["public"]["Tables"]["calendar_items"]["Row"];
type DbNote = Database["public"]["Tables"]["notes"]["Row"];
type DbNoteFolder = Database["public"]["Tables"]["note_folders"]["Row"];
type DbList = Database["public"]["Tables"]["lists"]["Row"];
type DbResponsibility = Database["public"]["Tables"]["responsibilities"]["Row"];

function dbTaskToDomain(row: DbTask): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    responsibilityId: row.responsibility_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    labels: row.labels ?? [],
    estimateMinutes: row.estimate_minutes ?? undefined,
    recurrence: row.recurrence ?? undefined,
    subtasks: (row.subtasks as Task["subtasks"]) ?? [],
  };
}

function dbCalendarItemToDomain(row: DbCalendarItem): CalendarItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type as CalendarItem["type"],
    responsibilityId: row.responsibility_id ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    source: (row.source as CalendarItem["source"]) ?? "app",
    externalId: row.external_id ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    recurrence: row.recurrence ?? undefined,
    recurrenceExceptions: (row.recurrence_exceptions as string[]) ?? [],
  };
}

function dbNoteToDomain(row: DbNote): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    responsibilityId: row.responsibility_id ?? "",
    folderId: row.folder_id ?? undefined,
    labels: row.labels ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at ?? undefined,
  };
}

function dbNoteFolderToDomain(row: DbNoteFolder): NoteFolder {
  return {
    id: row.id,
    name: row.name,
    color: row.color as ResponsibilityColor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbListToDomain(row: DbList): SavedList {
  return {
    id: row.id,
    title: row.title,
    responsibilityId: row.responsibility_id ?? "",
    items: (row.items as SavedList["items"]) ?? [],
    updatedAt: row.updated_at,
  };
}

function dbResponsibilityToDomain(
  row: DbResponsibility,
  allTasks: Task[],
  allCalendarItems: CalendarItem[]
): Responsibility {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const taskCount = allTasks.filter(
    (t) => t.responsibilityId === row.id && t.status !== "done"
  ).length;

  const upcomingCount = allCalendarItems.filter((ci) => {
    if (ci.responsibilityId !== row.id || ci.type === "time_log") return false;
    const s = new Date(ci.startsAt);
    return s >= now && s <= weekEnd;
  }).length;

  const actualHoursThisWeek = allCalendarItems
    .filter((ci) => {
      if (ci.responsibilityId !== row.id || ci.type !== "time_log") return false;
      const s = new Date(ci.startsAt);
      return s >= weekStart && s <= now;
    })
    .reduce((sum, ci) => {
      const ms = new Date(ci.endsAt).getTime() - new Date(ci.startsAt).getTime();
      return sum + ms / 3_600_000;
    }, 0);

  const plannedHoursThisWeek = allCalendarItems
    .filter((ci) => {
      if (ci.responsibilityId !== row.id || ci.type !== "time_block") return false;
      const s = new Date(ci.startsAt);
      return s >= weekStart && s <= weekEnd;
    })
    .reduce((sum, ci) => {
      const ms = new Date(ci.endsAt).getTime() - new Date(ci.startsAt).getTime();
      return sum + ms / 3_600_000;
    }, 0);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color as ResponsibilityColor,
    icon: row.icon,
    weeklyGoalHours: row.weekly_goal_hours,
    actualHoursThisWeek: Math.round(actualHoursThisWeek * 10) / 10,
    plannedHoursThisWeek: Math.round(plannedHoursThisWeek * 10) / 10,
    taskCount,
    upcomingCount,
    archivedAt: row.archived_at ?? undefined,
  };
}

// ─── Timer / misc helpers ─────────────────────────────────────────────────────

type TimerState = {
  running: boolean;
  responsibilityId: string;
  title: string;
  startedAt?: string;
};

function id(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseCapture(input: { text: string; source: CaptureExtraction["source"]; responsibilityId: string }): CaptureExtraction {
  const text = input.text.trim();
  const lower = text.toLowerCase();
  const isTimeLog = lower.includes("log") || lower.includes("pm") || lower.includes("am");
  const isMeeting = lower.includes("meeting") || lower.includes("call");
  const isReminder = lower.includes("remind");
  const listMatch = lower.match(/add\s+(.+?)\s+to\s+(?:my\s+)?(.+?)\s+list/);
  const listItemTitle = listMatch?.[1]?.trim();
  const listTitle = listMatch?.[2]?.trim();

  return {
    id: id("cap"),
    source: input.source,
    status: "pending_review",
    decisions: {},
    summary: text.slice(0, 72) || "Untitled capture",
    confidence: text.length > 24 ? 0.82 : 0.68,
    proposedTasks: isTimeLog || Boolean(listMatch)
      ? []
      : [{
          title: isReminder ? text.replace(/^remind me to /i, "") : text || "New captured task",
          priority: lower.includes("urgent") || lower.includes("friday") ? "high" : "medium",
          responsibilityId: input.responsibilityId,
          dueAt: lower.includes("tomorrow") ? undefined : undefined
        }],
    proposedEvents: isMeeting
      ? [{ title: text, type: "app_event", responsibilityId: input.responsibilityId, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 45 * 60_000).toISOString() }]
      : isTimeLog
        ? [{ title: text.replace(/^log /i, "") || "Captured time log", type: "time_log", responsibilityId: input.responsibilityId, startsAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), endsAt: new Date().toISOString() }]
        : [],
    proposedNotes: lower.includes("note") || lower.includes("compare")
      ? [{ title: "Captured note", body: text, responsibilityId: input.responsibilityId }]
      : [],
    proposedListItems: listMatch && listItemTitle && listTitle
      ? [{ listTitle: `${listTitle.charAt(0).toUpperCase()}${listTitle.slice(1)}`, itemTitle: `${listItemTitle.charAt(0).toUpperCase()}${listItemTitle.slice(1)}`, responsibilityId: input.responsibilityId }]
      : []
  };
}

// ─── Seed data for initial state ──────────────────────────────────────────────

const now = "2026-05-07T10:00:00-07:00";
const defaultNoteFolderIds = {
  research: "10000000-0000-4000-8000-000000000001",
  work: "10000000-0000-4000-8000-000000000002",
  leetcode: "10000000-0000-4000-8000-000000000003",
  systemDesign: "10000000-0000-4000-8000-000000000004",
  frontend: "10000000-0000-4000-8000-000000000005",
  backend: "10000000-0000-4000-8000-000000000006",
  databases: "10000000-0000-4000-8000-000000000007",
  aiMl: "10000000-0000-4000-8000-000000000008",
};

const seedNotes: Note[] = [];

const seedNoteFolders: NoteFolder[] = [
  { id: defaultNoteFolderIds.research, name: "Research", color: "basil", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.work, name: "Work", color: "tomato", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.leetcode, name: "LeetCode", color: "amber", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.systemDesign, name: "System Design", color: "peacock", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.frontend, name: "Frontend", color: "sky", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.backend, name: "Backend", color: "indigo", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.databases, name: "Databases", color: "grape", createdAt: now, updatedAt: now },
  { id: defaultNoteFolderIds.aiMl, name: "AI / ML", color: "lavender", createdAt: now, updatedAt: now },
];

const seedFiles: FileAsset[] = [];

// ─── Gym seed data ───────────────────────────────────────────────────────────

function makeExercise(name: string, sets: number, reps: number, muscleGroup: string): GymExercise {
  return { id: id("ex"), name, muscleGroup, defaultSets: sets, defaultReps: reps, lastWeight: 0 };
}

function buildGymSeed(): { gymExercises: GymExercise[]; gymDays: GymDay[] } {
  const push = [
    makeExercise("Bench Press", 4, 8, "chest"),
    makeExercise("Overhead Press", 4, 8, "shoulders"),
    makeExercise("Incline DB Press", 3, 10, "chest"),
    makeExercise("Tricep Pushdown", 3, 12, "arms"),
    makeExercise("Lateral Raise", 4, 15, "shoulders"),
  ];
  const pull = [
    makeExercise("Barbell Row", 4, 8, "back"),
    makeExercise("Lat Pulldown", 4, 10, "back"),
    makeExercise("Seated Cable Row", 3, 12, "back"),
    makeExercise("Bicep Curl", 3, 12, "arms"),
    makeExercise("Face Pull", 4, 15, "shoulders"),
  ];
  const legs = [
    makeExercise("Squat", 4, 6, "legs"),
    makeExercise("Leg Press", 4, 10, "legs"),
    makeExercise("Leg Extension", 3, 15, "legs"),
    makeExercise("Leg Curl", 3, 12, "legs"),
    makeExercise("Calf Raise", 4, 15, "legs"),
  ];
  const abs = [
    makeExercise("Plank", 3, 60, "core"),       // reps = seconds
    makeExercise("Cable Crunch", 3, 15, "core"),
    makeExercise("Leg Raise", 3, 15, "core"),
    makeExercise("Russian Twist", 3, 20, "core"),
    makeExercise("Ab Wheel", 3, 10, "core"),
  ];
  const gymExercises = [...push, ...pull, ...legs, ...abs];
  const gymDays: GymDay[] = [
    { dayIndex: 0, label: "Push",  exerciseIds: push.map(e => e.id) },
    { dayIndex: 1, label: "Pull",  exerciseIds: pull.map(e => e.id) },
    { dayIndex: 2, label: "Legs",  exerciseIds: legs.map(e => e.id) },
    { dayIndex: 3, label: "Abs",   exerciseIds: abs.map(e => e.id) },
    { dayIndex: 4, label: "Push",  exerciseIds: push.map(e => e.id) },
    { dayIndex: 5, label: "Pull",  exerciseIds: pull.map(e => e.id) },
    { dayIndex: 6, label: "Legs",  exerciseIds: legs.map(e => e.id) },
  ];
  return { gymExercises, gymDays };
}

// ─── Store types ──────────────────────────────────────────────────────────────

type AppState = {
  userId: string | null;
  responsibilities: Responsibility[];
  calendarItems: CalendarItem[];
  tasks: Task[];
  aiReviewItems: CaptureExtraction[];
  notes: Note[];
  noteFolders: NoteFolder[];
  files: FileAsset[];
  lists: SavedList[];
  timer: TimerState;

  // Auth / data loading
  setUserId: (id: string | null) => void;
  loadFromSupabase: (userId: string) => Promise<void>;

  // Google Calendar sync
  lastGoogleSync: string | null;
  syncGoogleCalendar: () => Promise<{ synced: number; errors: string[] }>;

  // Captures
  addCaptureExtraction: (input: { text: string; source: CaptureExtraction["source"]; responsibilityId: string }) => void;
  addParsedExtraction: (extraction: Omit<CaptureExtraction, "id">) => void;
  rejectExtraction: (extractionId: string) => void;
  updateExtractionProposal: (extractionId: string, itemId: string, input: { title?: string; responsibilityId?: string; startsAt?: string; endsAt?: string }) => void;

  // Calendar
  addCalendarItem: (input: Omit<CalendarItem, "id" | "source"> & { source?: CalendarItem["source"] }) => void;
  updateCalendarItem: (itemId: string, input: Partial<Omit<CalendarItem, "id">>) => void;
  deleteCalendarItem: (itemId: string) => void;
  deleteCalendarOccurrence: (masterId: string, dateKey: string) => void;
  moveCalendarItem: (itemId: string, startsAt: string, endsAt?: string) => void;

  // Tasks
  addTask: (input: { title: string; responsibilityId?: string; dueAt?: string; description?: string; labels?: string[]; priority?: Task["priority"]; recurrence?: string }) => void;
  updateTask: (taskId: string, input: Partial<Omit<Task, "id">>) => void;
  deleteTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;

  // Notes
  addNote: (input: { title: string; body: string; responsibilityId: string; folderId?: string; labels?: string[] }) => string;
  updateNote: (noteId: string, input: Partial<Omit<Note, "id" | "createdAt">>) => void;
  markNoteOpened: (noteId: string) => void;
  deleteNote: (noteId: string) => void;

  // Note folders
  addNoteFolder: (input: { name: string; color?: ResponsibilityColor }) => string;
  updateNoteFolder: (folderId: string, input: { name?: string; color?: ResponsibilityColor }) => void;
  deleteNoteFolder: (folderId: string) => void;

  // Lists
  addList: (input: { title: string; responsibilityId: string }) => void;
  addListItem: (input: { listId: string; title: string }) => void;
  toggleListItem: (listId: string, itemId: string) => void;
  renameList: (listId: string, input: { title?: string; responsibilityId?: string }) => void;
  deleteList: (listId: string) => void;
  deleteListItem: (listId: string, itemId: string) => void;

  // Files (local only)
  addMockFile: (input: { filename: string; responsibilityId: string }) => void;

  // Responsibilities
  addResponsibility: (input: { name: string; color: ResponsibilityColor; description?: string }) => string;
  updateResponsibility: (responsibilityId: string, input: { name?: string; description?: string; color?: ResponsibilityColor }) => void;
  updateResponsibilityColor: (responsibilityId: string, color: ResponsibilityColor) => void;
  deleteResponsibility: (responsibilityId: string) => void;
  setResponsibilityArchived: (responsibilityId: string, archived: boolean) => void;
  reorderResponsibilities: (orderedIds: string[]) => void;

  // Gym (localStorage only)
  gymExercises: GymExercise[];
  gymDays: GymDay[];
  gymSessions: GymSession[];
  activeGymSession: ActiveGymSession | null;
  gymWeightUnit: "lbs" | "kg";
  addGymExercise: (input: { name: string; defaultSets: number; defaultReps: number; muscleGroup?: string }) => GymExercise;
  updateGymExercise: (exerciseId: string, input: Partial<Omit<GymExercise, "id">>) => void;
  setDayExercises: (dayIndex: number, exerciseIds: string[]) => void;
  setDayLabel: (dayIndex: number, label: string) => void;
  startGymSession: (dayIndex: number) => void;
  updateActiveSet: (exerciseIdx: number, setIdx: number, patch: Partial<GymSet>) => void;
  addSetToActive: (exerciseIdx: number) => void;
  removeSetFromActive: (exerciseIdx: number, setIdx: number) => void;
  addExerciseToActive: (exerciseId: string) => void;
  finishGymSession: () => void;
  cancelGymSession: () => void;
  setGymWeightUnit: (unit: "lbs" | "kg") => void;
  initGymIfEmpty: () => void;

  // Habits (localStorage only — no Supabase table yet)
  habits: Habit[];
  habitLogs: HabitLog[];
  addHabit: (input: { title: string; type: HabitType; target: number; unit?: string; responsibilityId?: string }) => void;
  updateHabit: (habitId: string, input: { title?: string; type?: HabitType; target?: number; unit?: string; responsibilityId?: string }) => void;
  deleteHabit: (habitId: string) => void;
  logHabit: (habitId: string, date: string, value: number) => void;

  // Goals (localStorage only)
  goals: Goal[];
  addGoal: (input: { title: string; responsibilityId?: string; target: number; unit: string; deadline?: string; current?: number }) => void;
  updateGoal: (goalId: string, input: Partial<Omit<Goal, "id" | "createdAt">>) => void;
  deleteGoal: (goalId: string) => void;

  // Food (localStorage only)
  foodEntries: FoodEntry[];
  foodTargets: { calories: number; protein: number };
  addFoodEntry: (input: { date: string; name: string; meal: FoodMeal; calories: number; protein: number }) => void;
  deleteFoodEntry: (entryId: string) => void;
  setFoodTargets: (targets: { calories?: number; protein?: number }) => void;
  savedFoods: SavedFood[];
  addSavedFood: (input: { name: string; calories: number; protein: number }) => void;
  deleteSavedFood: (foodId: string) => void;

  // Ideas (localStorage only)
  ideas: Idea[];
  addIdea: (input: { title: string; responsibilityId?: string; notes?: string }) => void;
  updateIdea: (ideaId: string, input: Partial<Omit<Idea, "id" | "createdAt">>) => void;
  deleteIdea: (ideaId: string) => void;

  // AI review
  setExtractionDecision: (extractionId: string, itemId: string, approved: boolean) => void;
  commitExtraction: (extractionId: string) => void;

  // Timer
  setTimerResponsibility: (responsibilityId: string) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  addManualTimeLog: (input: { title: string; responsibilityId: string; startedAt: string; endedAt: string }) => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: null,
      responsibilities: [],
      calendarItems: [],
      tasks: [],
      aiReviewItems: [],
      notes: [],
      noteFolders: [],
      files: [],
      lists: [],
      habits: [],
      habitLogs: [],
      goals: [],
      foodEntries: [],
      foodTargets: { calories: 2500, protein: 160 },
      savedFoods: [],
      ideas: [],
      gymExercises: [],
      gymDays: [],
      gymSessions: [],
      activeGymSession: null,
      gymWeightUnit: "lbs",
      lastGoogleSync: null,
      timer: {
        running: false,
        responsibilityId: "",
        title: "Focus session"
      },

      // ── Auth / data loading ───────────────────────────────────────────────

      setUserId: (userId) => {
        if (userId === null) {
          set({
            userId: null,
            tasks,
            calendarItems,
            notes: seedNotes,
            noteFolders: seedNoteFolders,
            lists,
            responsibilities,
            files: seedFiles,
            aiReviewItems: aiReviewItems.map((item) => ({ ...item, status: "pending_review" as const, decisions: {} })),
          });
        } else {
          set({ userId });
        }
      },

      loadFromSupabase: async (userId: string) => {
        const db = getDb();
        if (!db) {
            set({ userId });
          return;
        }

        const [
          { data: dbTasks },
          { data: dbCalendarItems },
          { data: dbNotes },
          { data: dbNoteFolders },
          { data: dbLists },
          { data: dbResp },
          { data: dbAppState },
        ] = await Promise.all([
          db.from("tasks").select("*").eq("user_id", userId).neq("status", "archived"),
          db.from("calendar_items").select("*").eq("user_id", userId).order("starts_at"),
          db.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
          db.from("note_folders").select("*").eq("user_id", userId).order("sort_order"),
          db.from("lists").select("*").eq("user_id", userId),
          db.from("responsibilities").select("*").eq("user_id", userId).order("sort_order"),
          db.from("app_state").select("data").eq("user_id", userId).eq("key", "local_slices").maybeSingle(),
        ]);

        const loadedTasks = (dbTasks ?? []).map(dbTaskToDomain);
        const loadedItems = (dbCalendarItems ?? []).map(dbCalendarItemToDomain);
        const loadedNotes = (dbNotes ?? []).map(dbNoteToDomain);
        let loadedNoteFolders = (dbNoteFolders ?? []).map(dbNoteFolderToDomain);
        const loadedLists = (dbLists ?? []).map(dbListToDomain);

        if (!dbNoteFolders || dbNoteFolders.length === 0) {
          await db.from("note_folders").insert(
            seedNoteFolders.map((folder, i) => ({
              id: folder.id,
              user_id: userId,
              name: folder.name,
              color: folder.color,
              sort_order: i,
            }))
          );
          loadedNoteFolders = seedNoteFolders;
        }

        let loadedResp: Responsibility[];
        if (!dbResp || dbResp.length === 0) {
          // First login: seed responsibilities from mock data
          await db.from("responsibilities").insert(
            responsibilities.map((r, i) => ({
              id: r.id,
              user_id: userId,
              name: r.name,
              description: r.description,
              color: r.color,
              icon: r.icon,
              weekly_goal_hours: r.weeklyGoalHours,
              sort_order: i,
            }))
          );
          loadedResp = responsibilities.map((r) =>
            dbResponsibilityToDomain({ id: r.id, user_id: userId, name: r.name, description: r.description, color: r.color, icon: r.icon, weekly_goal_hours: r.weeklyGoalHours, sort_order: 0, archived_at: null, created_at: new Date().toISOString() }, loadedTasks, loadedItems)
          );
        } else {
          loadedResp = dbResp.map((r) => dbResponsibilityToDomain(r, loadedTasks, loadedItems));
        }

        set({
          userId,
          tasks: loadedTasks,
          calendarItems: loadedItems,
          notes: loadedNotes,
          noteFolders: loadedNoteFolders,
          lists: loadedLists,
          responsibilities: loadedResp,
          files: [],
          aiReviewItems: [],
        });

        // Cross-device slices (habits, gym, goals, food, ideas): server copy
        // wins when it exists; otherwise push this device's local data up once.
        if (dbAppState?.data && typeof dbAppState.data === "object") {
          applyingServerSlices = true;
          set(dbAppState.data as Partial<AppState>);
          applyingServerSlices = false;
        } else {
          db.from("app_state")
            .upsert({ user_id: userId, key: "local_slices", data: localSlices(get()) as Json })
            .then(({ error }) => { if (error) console.error("app_state seed:", error.message); });
        }
      },

      // ── Captures ─────────────────────────────────────────────────────────

      addCaptureExtraction: (input) =>
        set((state) => ({ aiReviewItems: [parseCapture(input), ...state.aiReviewItems] })),

      addParsedExtraction: (extraction) =>
        set((state) => ({
          aiReviewItems: [{ ...extraction, id: id("cap") }, ...state.aiReviewItems],
        })),

      rejectExtraction: (extractionId) =>
        set((state) => ({
          aiReviewItems: state.aiReviewItems.map((item) =>
            item.id === extractionId ? { ...item, status: "rejected" as const } : item
          ),
        })),

      updateExtractionProposal: (extractionId, itemId, input) =>
        set((state) => ({
          aiReviewItems: state.aiReviewItems.map((item) => {
            if (item.id !== extractionId) return item;

            const [kind, ...rest] = itemId.split("-");
            const title = rest.join("-");
            const updateCommon = <T extends { title: string; responsibilityId?: string }>(entry: T): T => ({
              ...entry,
              ...(input.title !== undefined && { title: input.title }),
              ...(input.responsibilityId !== undefined && { responsibilityId: input.responsibilityId }),
            });

            if (kind === "task") {
              return {
                ...item,
                proposedTasks: item.proposedTasks.map((task) =>
                  task.title === title ? updateCommon(task) : task
                ),
              };
            }
            if (kind === "event") {
              return {
                ...item,
                proposedEvents: item.proposedEvents.map((event) =>
                  event.title === title
                    ? {
                        ...updateCommon(event),
                        ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
                        ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
                      }
                    : event
                ),
              };
            }
            if (kind === "note") {
              return {
                ...item,
                proposedNotes: item.proposedNotes.map((note) =>
                  note.title === title ? updateCommon(note) : note
                ),
              };
            }
            if (kind === "list") {
              const [listTitle, itemTitle] = title.split(":");
              return {
                ...item,
                proposedListItems: (item.proposedListItems ?? []).map((listItem) =>
                  listItem.listTitle === listTitle && listItem.itemTitle === itemTitle
                    ? {
                        ...listItem,
                        ...(input.title !== undefined && { itemTitle: input.title }),
                        ...(input.responsibilityId !== undefined && { responsibilityId: input.responsibilityId }),
                      }
                    : listItem
                ),
              };
            }
            return item;
          }),
        })),

      // ── Calendar ─────────────────────────────────────────────────────────

      addCalendarItem: (input) => {
        const itemId = id("evt");
        const newItem: CalendarItem = {
          id: itemId,
          title: input.title,
          type: input.type,
          responsibilityId: input.responsibilityId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          source: input.source ?? "app",
          location: input.location,
          notes: input.notes,
          recurrence: input.recurrence,
          recurrenceExceptions: [],
        };
        set((state) => ({
          calendarItems: [newItem, ...state.calendarItems],
          responsibilities: state.responsibilities.map((r) =>
            r.id === input.responsibilityId ? { ...r, upcomingCount: r.upcomingCount + 1 } : r
          ),
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("calendar_items").insert({ id: itemId, user_id: userId, responsibility_id: input.responsibilityId || null, type: input.type, title: input.title, starts_at: input.startsAt, ends_at: input.endsAt, source: input.source ?? "app", location: input.location ?? null, notes: input.notes ?? null, recurrence: input.recurrence ?? null })
            .then(({ error }) => { if (error) console.error("addCalendarItem:", error.message); });
        }
      },

      updateCalendarItem: (itemId, input) => {
        set((state) => ({
          calendarItems: state.calendarItems.map((item) => (item.id === itemId ? { ...item, ...input } : item))
        }));
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (db) {
            db.from("calendar_items").update({
              ...(input.title !== undefined && { title: input.title }),
              ...(input.type !== undefined && { type: input.type }),
              ...(input.startsAt !== undefined && { starts_at: input.startsAt }),
              ...(input.endsAt !== undefined && { ends_at: input.endsAt }),
              ...(input.location !== undefined && { location: input.location }),
              ...(input.notes !== undefined && { notes: input.notes }),
              ...(input.responsibilityId !== undefined && { responsibility_id: input.responsibilityId }),
              ...("recurrence" in input && { recurrence: input.recurrence ?? null }),
            }).eq("id", itemId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("updateCalendarItem:", error.message); });
          }
        }
      },

      deleteCalendarItem: (itemId) => {
        set((state) => ({ calendarItems: state.calendarItems.filter((item) => item.id !== itemId) }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("calendar_items").delete().eq("id", itemId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("deleteCalendarItem:", error.message); });
        }
      },

      deleteCalendarOccurrence: (masterId, dateKey) => {
        let nextExceptions: string[] = [];
        set((state) => ({
          calendarItems: state.calendarItems.map((item) => {
            if (item.id !== masterId) return item;
            nextExceptions = [...(item.recurrenceExceptions ?? []), dateKey];
            return { ...item, recurrenceExceptions: nextExceptions };
          }),
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("calendar_items").update({ recurrence_exceptions: nextExceptions }).eq("id", masterId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("deleteCalendarOccurrence:", error.message); });
        }
      },

      moveCalendarItem: (itemId, startsAt, endsAt) => {
        set((state) => ({
          calendarItems: state.calendarItems.map((item) =>
            item.id === itemId ? { ...item, startsAt, endsAt: endsAt ?? item.endsAt } : item
          )
        }));
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (db) {
            db.from("calendar_items").update({
              starts_at: startsAt,
              ...(endsAt !== undefined && { ends_at: endsAt }),
            }).eq("id", itemId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("moveCalendarItem:", error.message); });
          }
        }
      },

      // ── Tasks ─────────────────────────────────────────────────────────────

      addTask: (input) => {
        const taskId = id("task");
        const newTask: Task = {
          id: taskId,
          title: input.title,
          description: input.description,
          responsibilityId: input.responsibilityId,
          dueAt: input.dueAt,
          priority: input.priority ?? "medium",
          status: "todo",
          labels: input.labels?.length ? input.labels.slice(0, 1) : ["Life"],
          estimateMinutes: 30,
          recurrence: input.recurrence,
          subtasks: [],
        };
        set((state) => ({
          tasks: [newTask, ...state.tasks],
          responsibilities: state.responsibilities.map((r) =>
            input.responsibilityId && r.id === input.responsibilityId
              ? { ...r, taskCount: r.taskCount + 1 }
              : r
          ),
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("tasks").insert({ id: taskId, user_id: userId, responsibility_id: input.responsibilityId ?? null, title: input.title, description: input.description ?? null, priority: input.priority ?? "medium", due_at: input.dueAt ?? null, labels: input.labels?.length ? input.labels.slice(0, 1) : ["Life"], subtasks: [], estimate_minutes: 30, recurrence: input.recurrence ?? null })
            .then(({ error }) => { if (error) console.error("addTask:", error.message); });
        }
      },

      updateTask: (taskId, input) => {
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...input } : task))
        }));
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (db) {
            db.from("tasks").update({
              ...(input.title !== undefined && { title: input.title }),
              ...("description" in input && { description: input.description ?? null }),
              ...(input.status !== undefined && { status: input.status }),
              ...(input.status === "done" && { completed_at: new Date().toISOString() }),
              ...(input.priority !== undefined && { priority: input.priority }),
              ...("dueAt" in input && { due_at: input.dueAt ?? null }),
              ...("recurrence" in input && { recurrence: input.recurrence ?? null }),
              ...(input.labels !== undefined && { labels: input.labels }),
              ...(input.estimateMinutes !== undefined && { estimate_minutes: input.estimateMinutes }),
              ...("responsibilityId" in input && { responsibility_id: input.responsibilityId ?? null }),
              ...(input.subtasks !== undefined && { subtasks: input.subtasks }),
            }).eq("id", taskId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("updateTask:", error.message); });
          }
        }
      },

      deleteTask: (taskId) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("tasks").delete().eq("id", taskId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("deleteTask:", error.message); });
        }
      },

      toggleTask: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const { userId } = get();

        // Completing a recurring task reschedules it instead of finishing it
        if (task.status !== "done" && task.recurrence) {
          const nextDue = nextOccurrence(task.recurrence, task.dueAt);
          if (nextDue) {
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: "todo", dueAt: nextDue } : t))
            }));
            if (userId) {
              getDb()?.from("tasks").update({ status: "todo", due_at: nextDue }).eq("id", taskId).eq("user_id", userId)
                .then(({ error }) => { if (error) console.error("toggleTask:", error.message); });
            }
            return;
          }
        }

        const newStatus: Task["status"] = task.status === "done" ? "todo" : "done";
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        }));
        if (userId) {
          getDb()?.from("tasks").update({ status: newStatus }).eq("id", taskId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("toggleTask:", error.message); });
        }
      },

      // ── Notes ─────────────────────────────────────────────────────────────

      addNote: (input) => {
        const noteId = id("note");
        const timestamp = new Date().toISOString();
        const newNote: Note = {
          id: noteId,
          title: input.title,
          body: input.body,
          responsibilityId: input.responsibilityId,
          folderId: input.folderId,
          labels: input.labels ?? [],
          createdAt: timestamp,
          updatedAt: timestamp,
          lastOpenedAt: timestamp,
        };
        set((state) => ({ notes: [newNote, ...state.notes] }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("notes").insert({ id: noteId, user_id: userId, responsibility_id: input.responsibilityId || null, folder_id: input.folderId ?? null, title: input.title, body: input.body, labels: input.labels ?? [], last_opened_at: timestamp })
            .then(({ error }) => { if (error) console.error("addNote:", error.message); });
        }
        return noteId;
      },

      updateNote: (noteId, input) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, ...input, updatedAt: new Date().toISOString() } : note
          )
        }));
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (db) {
            db.from("notes").update({
              ...(input.title !== undefined && { title: input.title }),
              ...(input.body !== undefined && { body: input.body }),
              ...(input.labels !== undefined && { labels: input.labels }),
              ...(input.responsibilityId !== undefined && { responsibility_id: input.responsibilityId }),
              ...(input.folderId !== undefined && { folder_id: input.folderId || null }),
            }).eq("id", noteId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("updateNote:", error.message); });
          }
        }
      },

      markNoteOpened: (noteId) => {
        const ts = new Date().toISOString();
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, lastOpenedAt: ts } : note
          )
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("notes").update({ last_opened_at: ts }).eq("id", noteId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("markNoteOpened:", error.message); });
        }
      },

      deleteNote: (noteId) => {
        set((state) => ({ notes: state.notes.filter((note) => note.id !== noteId) }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("notes").delete().eq("id", noteId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("deleteNote:", error.message); });
        }
      },

      // ── Note folders ─────────────────────────────────────────────────────

      addNoteFolder: (input) => {
        const folderId = id("folder");
        const timestamp = new Date().toISOString();
        const newFolder: NoteFolder = {
          id: folderId,
          name: input.name,
          color: input.color ?? "blue",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const sortOrder = get().noteFolders.length;
        set((state) => ({ noteFolders: [...state.noteFolders, newFolder] }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("note_folders").insert({ id: folderId, user_id: userId, name: input.name, color: input.color ?? "blue", sort_order: sortOrder })
            .then(({ error }) => { if (error) console.error("addNoteFolder:", error.message); });
        }
        return folderId;
      },

      updateNoteFolder: (folderId, input) => {
        set((state) => ({
          noteFolders: state.noteFolders.map((folder) =>
            folder.id === folderId ? { ...folder, ...input, updatedAt: new Date().toISOString() } : folder
          )
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("note_folders").update({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.color !== undefined && { color: input.color }),
          }).eq("id", folderId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("updateNoteFolder:", error.message); });
        }
      },

      deleteNoteFolder: (folderId) => {
        set((state) => ({
          noteFolders: state.noteFolders.filter((folder) => folder.id !== folderId),
          notes: state.notes.map((note) =>
            note.folderId === folderId ? { ...note, folderId: undefined, updatedAt: new Date().toISOString() } : note
          ),
        }));
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (db) {
            db.from("notes").update({ folder_id: null }).eq("folder_id", folderId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("deleteNoteFolder notes:", error.message); });
            db.from("note_folders").delete().eq("id", folderId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("deleteNoteFolder:", error.message); });
          }
        }
      },

      // ── Lists ─────────────────────────────────────────────────────────────

      addList: (input) => {
        const listId = id("list");
        const newList: SavedList = {
          id: listId,
          title: input.title,
          responsibilityId: input.responsibilityId,
          updatedAt: new Date().toISOString(),
          items: [],
        };
        set((state) => ({ lists: [newList, ...state.lists] }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("lists").insert({ id: listId, user_id: userId, responsibility_id: input.responsibilityId || null, title: input.title, items: [] })
            .then(({ error }) => { if (error) console.error("addList:", error.message); });
        }
      },

      addListItem: (input) => {
        const itemId = id("list-item");
        const updatedAt = new Date().toISOString();
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === input.listId
              ? { ...list, updatedAt, items: [...list.items, { id: itemId, title: input.title, done: false }] }
              : list
          )
        }));
        const { userId } = get();
        if (userId) {
          const list = get().lists.find((l) => l.id === input.listId);
          if (list) {
            getDb()?.from("lists").update({ items: list.items }).eq("id", input.listId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("addListItem:", error.message); });
          }
        }
      },

      toggleListItem: (listId, itemId) => {
        const updatedAt = new Date().toISOString();
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? { ...list, updatedAt, items: list.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)) }
              : list
          )
        }));
        const { userId } = get();
        if (userId) {
          const list = get().lists.find((l) => l.id === listId);
          if (list) {
            getDb()?.from("lists").update({ items: list.items }).eq("id", listId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("toggleListItem:", error.message); });
          }
        }
      },

      renameList: (listId, input) => {
        const updatedAt = new Date().toISOString();
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? { ...list, updatedAt, ...(input.title !== undefined && { title: input.title }), ...(input.responsibilityId !== undefined && { responsibilityId: input.responsibilityId }) }
              : list
          )
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("lists").update({
            ...(input.title !== undefined && { title: input.title }),
            ...(input.responsibilityId !== undefined && { responsibility_id: input.responsibilityId }),
          }).eq("id", listId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("renameList:", error.message); });
        }
      },

      deleteList: (listId) => {
        set((state) => ({ lists: state.lists.filter((list) => list.id !== listId) }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("lists").delete().eq("id", listId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("deleteList:", error.message); });
        }
      },

      deleteListItem: (listId, itemId) => {
        const updatedAt = new Date().toISOString();
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? { ...list, updatedAt, items: list.items.filter((item) => item.id !== itemId) }
              : list
          )
        }));
        const { userId } = get();
        if (userId) {
          const list = get().lists.find((l) => l.id === listId);
          if (list) {
            getDb()?.from("lists").update({ items: list.items }).eq("id", listId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("deleteListItem:", error.message); });
          }
        }
      },

      // ── Files (local only) ────────────────────────────────────────────────

      addMockFile: (input) =>
        set((state) => ({
          files: [
            {
              id: id("file"),
              filename: input.filename,
              mimeType: input.filename.endsWith(".pdf") ? "application/pdf" : "text/plain",
              sizeLabel: "Local mock",
              responsibilityId: input.responsibilityId,
              createdAt: new Date().toISOString(),
            },
            ...state.files,
          ]
        })),

      // ── Responsibilities ──────────────────────────────────────────────────

      addResponsibility: (input) => {
        const respId = id("resp");
        const newResp: Responsibility = {
          id: respId,
          name: input.name,
          description: input.description ?? "",
          color: input.color,
          icon: "Circle",
          weeklyGoalHours: 0,
          actualHoursThisWeek: 0,
          plannedHoursThisWeek: 0,
          taskCount: 0,
          upcomingCount: 0,
        };
        const sortOrder = get().responsibilities.length;
        set((state) => ({ responsibilities: [...state.responsibilities, newResp] }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("responsibilities").insert({ id: respId, user_id: userId, name: input.name, description: input.description ?? "", color: input.color, icon: "Circle", weekly_goal_hours: 0, sort_order: sortOrder })
            .then(({ error }) => { if (error) console.error("addResponsibility:", error.message); });
        }
        return respId;
      },

      updateResponsibility: (responsibilityId, input) => {
        set((state) => ({
          responsibilities: state.responsibilities.map((r) =>
            r.id === responsibilityId ? { ...r, ...input } : r
          )
        }));
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (db) {
            db.from("responsibilities").update({
              ...(input.name !== undefined && { name: input.name }),
              ...(input.description !== undefined && { description: input.description }),
              ...(input.color !== undefined && { color: input.color }),
            }).eq("id", responsibilityId).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("updateResponsibility:", error.message); });
          }
        }
      },

      updateResponsibilityColor: (responsibilityId, color) => {
        set((state) => ({
          responsibilities: state.responsibilities.map((r) =>
            r.id === responsibilityId ? { ...r, color } : r
          )
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("responsibilities").update({ color }).eq("id", responsibilityId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("updateResponsibilityColor:", error.message); });
        }
      },

      deleteResponsibility: (responsibilityId) => {
        set((state) => ({
          responsibilities: state.responsibilities.filter((r) => r.id !== responsibilityId)
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("responsibilities").delete().eq("id", responsibilityId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("deleteResponsibility:", error.message); });
        }
      },

      setResponsibilityArchived: (responsibilityId, archived) => {
        const archivedAt = archived ? new Date().toISOString() : undefined;
        set((state) => ({
          responsibilities: state.responsibilities.map((r) =>
            r.id === responsibilityId ? { ...r, archivedAt } : r
          ),
        }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("responsibilities").update({ archived_at: archivedAt ?? null }).eq("id", responsibilityId).eq("user_id", userId)
            .then(({ error }) => { if (error) console.error("setResponsibilityArchived:", error.message); });
        }
      },

      reorderResponsibilities: (orderedIds) => {
        set((state) => {
          const byId = new Map(state.responsibilities.map((r) => [r.id, r]));
          const reordered = orderedIds.map((rid) => byId.get(rid)).filter((r): r is Responsibility => Boolean(r));
          const rest = state.responsibilities.filter((r) => !orderedIds.includes(r.id));
          return { responsibilities: [...reordered, ...rest] };
        });
        const { userId } = get();
        const db = getDb();
        if (userId && db) {
          get().responsibilities.forEach((r, i) => {
            db.from("responsibilities").update({ sort_order: i }).eq("id", r.id).eq("user_id", userId)
              .then(({ error }) => { if (error) console.error("reorderResponsibilities:", error.message); });
          });
        }
      },

      // ── Gym ───────────────────────────────────────────────────────────────

      addGymExercise: (input) => {
        const ex: GymExercise = { ...input, id: id("ex"), lastWeight: 0 };
        set((state) => {
          if (state.gymDays.length === 0) {
            const seed = buildGymSeed();
            return { gymExercises: [...seed.gymExercises, ex], gymDays: seed.gymDays };
          }
          return { gymExercises: [...state.gymExercises, ex] };
        });
        return ex;
      },

      updateGymExercise: (exerciseId, input) =>
        set((state) => ({
          gymExercises: state.gymExercises.map((e) => (e.id === exerciseId ? { ...e, ...input } : e)),
        })),

      setDayExercises: (dayIndex, exerciseIds) =>
        set((state) => ({
          gymDays: state.gymDays.map((d) => (d.dayIndex === dayIndex ? { ...d, exerciseIds } : d)),
        })),

      setDayLabel: (dayIndex, label) =>
        set((state) => ({
          gymDays: state.gymDays.map((d) => (d.dayIndex === dayIndex ? { ...d, label } : d)),
        })),

      startGymSession: (dayIndex) => {
        if (get().activeGymSession) return;

        let { gymExercises, gymDays } = get();
        if (gymDays.length === 0) {
          const seed = buildGymSeed();
          set({ gymExercises: seed.gymExercises, gymDays: seed.gymDays });
          gymExercises = seed.gymExercises;
          gymDays = seed.gymDays;
        }

        const day = gymDays.find((d) => d.dayIndex === dayIndex);
        if (!day) return;

        const allEx = gymExercises;
        const exercises: GymSessionExercise[] = day.exerciseIds.map((exId) => {
          const ex = allEx.find((e) => e.id === exId);
          if (!ex) return null;
          return {
            exerciseId: exId,
            sets: Array.from({ length: ex.defaultSets }, () => ({
              weight: ex.lastWeight,
              reps: ex.defaultReps,
              done: false,
            })),
          };
        }).filter(Boolean) as GymSessionExercise[];

        set({
          activeGymSession: {
            date: new Date().toISOString().slice(0, 10),
            dayLabel: day.label,
            startedAt: new Date().toISOString(),
            exercises,
          },
        });
      },

      updateActiveSet: (exerciseIdx, setIdx, patch) =>
        set((state) => {
          if (!state.activeGymSession) return {};
          const exercises = state.activeGymSession.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex;
            const sets = ex.sets.map((s, si) => (si === setIdx ? { ...s, ...patch } : s));
            return { ...ex, sets };
          });
          return { activeGymSession: { ...state.activeGymSession, exercises } };
        }),

      addSetToActive: (exerciseIdx) =>
        set((state) => {
          if (!state.activeGymSession) return {};
          const exercises = state.activeGymSession.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex;
            const last = ex.sets[ex.sets.length - 1];
            return { ...ex, sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false }] };
          });
          return { activeGymSession: { ...state.activeGymSession, exercises } };
        }),

      removeSetFromActive: (exerciseIdx, setIdx) =>
        set((state) => {
          if (!state.activeGymSession) return {};
          const exercises = state.activeGymSession.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex;
            return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) };
          });
          return { activeGymSession: { ...state.activeGymSession, exercises } };
        }),

      addExerciseToActive: (exerciseId) =>
        set((state) => {
          if (!state.activeGymSession) return {};
          const ex = state.gymExercises.find((e) => e.id === exerciseId);
          if (!ex) return {};
          const newEx: GymSessionExercise = {
            exerciseId,
            sets: Array.from({ length: ex.defaultSets }, () => ({ weight: ex.lastWeight, reps: ex.defaultReps, done: false })),
          };
          return { activeGymSession: { ...state.activeGymSession, exercises: [...state.activeGymSession.exercises, newEx] } };
        }),

      finishGymSession: () => {
        const { activeGymSession, gymExercises } = get();
        if (!activeGymSession) return;
        const session: GymSession = {
          id: id("session"),
          date: activeGymSession.date,
          dayLabel: activeGymSession.dayLabel,
          startedAt: activeGymSession.startedAt,
          completedAt: new Date().toISOString(),
          exercises: activeGymSession.exercises,
        };
        // Update lastWeight for each exercise based on last completed set
        const updatedExercises = gymExercises.map((ex) => {
          const sessionEx = activeGymSession.exercises.find((e) => e.exerciseId === ex.id);
          if (!sessionEx) return ex;
          const doneSets = sessionEx.sets.filter((s) => s.done && s.weight > 0);
          if (doneSets.length === 0) return ex;
          const lastWeight = doneSets[doneSets.length - 1].weight;
          return { ...ex, lastWeight };
        });
        set({ activeGymSession: null, gymSessions: [session, ...get().gymSessions], gymExercises: updatedExercises });
      },

      cancelGymSession: () => set({ activeGymSession: null }),

      setGymWeightUnit: (unit) => set({ gymWeightUnit: unit }),

      // ── Google Calendar sync ───────────────────────────────────────────────

      syncGoogleCalendar: async () => {
        const res = await fetch("/api/google/sync", { method: "POST" });
        const data = await res.json() as { synced: number; errors: string[] };
        if (res.ok && data.synced >= 0) {
          set({ lastGoogleSync: new Date().toISOString() });
          // Reload calendar items from Supabase so newly synced events appear
          const userId = get().userId;
          if (userId) await get().loadFromSupabase(userId);
        }
        return data;
      },

      initGymIfEmpty: () => {
        if (get().gymDays.length === 0) {
          const seed = buildGymSeed();
          set({ gymExercises: seed.gymExercises, gymDays: seed.gymDays });
        }
      },

      // ── Habits ────────────────────────────────────────────────────────────

      addHabit: (input) =>
        set((state) => ({
          habits: [...state.habits, { ...input, id: id("habit"), createdAt: new Date().toISOString() }],
        })),

      updateHabit: (habitId, input) =>
        set((state) => ({
          habits: state.habits.map((h) => (h.id === habitId ? { ...h, ...input } : h)),
        })),

      deleteHabit: (habitId) =>
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== habitId),
          habitLogs: state.habitLogs.filter((l) => l.habitId !== habitId),
        })),

      logHabit: (habitId, date, value) =>
        set((state) => {
          const idx = state.habitLogs.findIndex((l) => l.habitId === habitId && l.date === date);
          if (idx >= 0) {
            if (value === 0) {
              const logs = [...state.habitLogs];
              logs.splice(idx, 1);
              return { habitLogs: logs };
            }
            return {
              habitLogs: state.habitLogs.map((l, i) => (i === idx ? { ...l, value } : l)),
            };
          }
          if (value === 0) return {};
          return { habitLogs: [...state.habitLogs, { habitId, date, value }] };
        }),

      // ── Goals ─────────────────────────────────────────────────────────────

      addGoal: (input) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              id: id("goal"),
              title: input.title,
              responsibilityId: input.responsibilityId,
              current: input.current ?? 0,
              target: input.target,
              unit: input.unit,
              deadline: input.deadline,
              status: "active" as const,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateGoal: (goalId, input) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...input } : g)),
        })),

      deleteGoal: (goalId) =>
        set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) })),

      // ── Food ──────────────────────────────────────────────────────────────

      addFoodEntry: (input) =>
        set((state) => ({
          foodEntries: [{ id: id("food"), ...input }, ...state.foodEntries],
        })),

      deleteFoodEntry: (entryId) =>
        set((state) => ({ foodEntries: state.foodEntries.filter((e) => e.id !== entryId) })),

      setFoodTargets: (targets) =>
        set((state) => ({ foodTargets: { ...state.foodTargets, ...targets } })),

      addSavedFood: (input) =>
        set((state) => {
          // One library entry per name — re-saving updates the macros
          const existing = state.savedFoods.find((f) => f.name.toLowerCase() === input.name.toLowerCase());
          if (existing) {
            return {
              savedFoods: state.savedFoods.map((f) =>
                f.id === existing.id ? { ...f, name: input.name, calories: input.calories, protein: input.protein } : f
              ),
            };
          }
          return {
            savedFoods: [{ id: id("sfood"), createdAt: new Date().toISOString(), ...input }, ...state.savedFoods],
          };
        }),

      deleteSavedFood: (foodId) =>
        set((state) => ({ savedFoods: state.savedFoods.filter((f) => f.id !== foodId) })),

      // ── Ideas ─────────────────────────────────────────────────────────────

      addIdea: (input) =>
        set((state) => ({
          ideas: [
            {
              id: id("idea"),
              title: input.title,
              responsibilityId: input.responsibilityId,
              notes: input.notes,
              status: "raw" as const,
              createdAt: new Date().toISOString(),
            },
            ...state.ideas,
          ],
        })),

      updateIdea: (ideaId, input) =>
        set((state) => ({
          ideas: state.ideas.map((i) => (i.id === ideaId ? { ...i, ...input } : i)),
        })),

      deleteIdea: (ideaId) =>
        set((state) => ({ ideas: state.ideas.filter((i) => i.id !== ideaId) })),

      // ── AI review ─────────────────────────────────────────────────────────

      setExtractionDecision: (extractionId, itemId, approved) =>
        set((state) => ({
          aiReviewItems: state.aiReviewItems.map((item) =>
            item.id === extractionId
              ? { ...item, decisions: { ...item.decisions, [itemId]: approved }, status: "partially_approved" as const }
              : item
          )
        })),

      commitExtraction: (extractionId) => {
        const extraction = get().aiReviewItems.find((item) => item.id === extractionId);
        if (!extraction) return;

        const shouldCommit = (kind: string, title: string) => extraction.decisions?.[`${kind}-${title}`] !== false;

        const respName = (respId?: string) => {
          const resp = get().responsibilities.find((r) => r.id === respId);
          return resp ? [resp.name] : [];
        };

        const newTasks: Task[] = extraction.proposedTasks.filter((task) => shouldCommit("task", task.title)).map((task) => ({
          id: id("task"), title: task.title, responsibilityId: task.responsibilityId, dueAt: task.dueAt, priority: task.priority ?? "medium", status: "todo" as const, labels: respName(task.responsibilityId), estimateMinutes: 30, subtasks: []
        }));

        const newEvents: CalendarItem[] = extraction.proposedEvents.filter((event) => shouldCommit("event", event.title)).map((event) => ({
          id: id("evt"), title: event.title, type: event.type, responsibilityId: event.responsibilityId, startsAt: event.startsAt, endsAt: event.endsAt, source: "ai_review" as const
        }));

        const newNotes: Note[] = extraction.proposedNotes.filter((note) => shouldCommit("note", note.title)).map((note) => ({
          id: id("note"), title: note.title, body: note.body, responsibilityId: note.responsibilityId, labels: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString()
        }));

        const newListItems = (extraction.proposedListItems ?? []).filter((item) => shouldCommit("list", `${item.listTitle}:${item.itemTitle}`));

        set((state) => ({
          tasks: [...newTasks, ...state.tasks],
          calendarItems: [...newEvents, ...state.calendarItems],
          notes: [...newNotes, ...state.notes],
          lists: newListItems.reduce((currentLists, listItem) => {
            const existing = currentLists.find((l) => l.title.toLowerCase() === listItem.listTitle.toLowerCase());
            if (existing) {
              return currentLists.map((l) =>
                l.id === existing.id
                  ? { ...l, updatedAt: new Date().toISOString(), items: [...l.items, { id: id("list-item"), title: listItem.itemTitle, done: false }] }
                  : l
              );
            }
            return [{ id: id("list"), title: listItem.listTitle, responsibilityId: listItem.responsibilityId, updatedAt: new Date().toISOString(), items: [{ id: id("list-item"), title: listItem.itemTitle, done: false }] }, ...currentLists];
          }, state.lists),
          aiReviewItems: state.aiReviewItems.map((item) => (item.id === extractionId ? { ...item, status: "approved" as const } : item))
        }));

        // Write committed items to Supabase
        const { userId } = get();
        if (userId) {
          const db = getDb();
          if (!db) return;
          if (newTasks.length > 0) {
            db.from("tasks").insert(newTasks.map((t) => ({ id: t.id, user_id: userId, responsibility_id: t.responsibilityId ?? null, title: t.title, priority: t.priority, status: t.status, due_at: t.dueAt ?? null, labels: t.labels ?? [], subtasks: [] })))
              .then(({ error }) => { if (error) console.error("commitExtraction tasks:", error.message); });
          }
          if (newEvents.length > 0) {
            db.from("calendar_items").insert(newEvents.map((e) => ({ id: e.id, user_id: userId, responsibility_id: e.responsibilityId || null, type: e.type, title: e.title, starts_at: e.startsAt, ends_at: e.endsAt, source: e.source ?? "ai_review" })))
              .then(({ error }) => { if (error) console.error("commitExtraction events:", error.message); });
          }
          if (newNotes.length > 0) {
            db.from("notes").insert(newNotes.map((n) => ({ id: n.id, user_id: userId, responsibility_id: n.responsibilityId || null, title: n.title, body: n.body, labels: [] })))
              .then(({ error }) => { if (error) console.error("commitExtraction notes:", error.message); });
          }
        }
      },

      // ── Timer ─────────────────────────────────────────────────────────────

      setTimerResponsibility: (responsibilityId) =>
        set((state) => ({ timer: { ...state.timer, responsibilityId } })),

      startTimer: () =>
        set((state) => ({ timer: { ...state.timer, running: true, startedAt: new Date().toISOString() } })),

      pauseTimer: () =>
        set((state) => ({ timer: { ...state.timer, running: false } })),

      stopTimer: () => {
        const { timer } = get();
        if (!timer.startedAt) {
          set((state) => ({ timer: { ...state.timer, running: false } }));
          return;
        }
        const endedAt = new Date().toISOString();
        get().addManualTimeLog({ title: timer.title, responsibilityId: timer.responsibilityId, startedAt: timer.startedAt, endedAt });
        set((state) => ({ timer: { ...state.timer, running: false, startedAt: undefined } }));
      },

      addManualTimeLog: (input) => {
        const logId = id("log");
        const newItem: CalendarItem = {
          id: logId,
          title: input.title,
          type: "time_log",
          responsibilityId: input.responsibilityId,
          startsAt: input.startedAt,
          endsAt: input.endedAt,
          source: "app",
        };
        set((state) => ({ calendarItems: [newItem, ...state.calendarItems] }));
        const { userId } = get();
        if (userId) {
          getDb()?.from("calendar_items").insert({ id: logId, user_id: userId, responsibility_id: input.responsibilityId || null, type: "time_log", title: input.title, starts_at: input.startedAt, ends_at: input.endedAt, source: "app" })
            .then(({ error }) => { if (error) console.error("addManualTimeLog:", error.message); });
        }
      },
    }),
    {
      name: "jacob-os-ui-v1",
      // Only persist UI state — data comes from Supabase on auth
      partialize: (state) => ({
        timer: state.timer,
        lastGoogleSync: state.lastGoogleSync,
        habits: state.habits,
        habitLogs: state.habitLogs,
        gymExercises: state.gymExercises,
        gymDays: state.gymDays,
        gymSessions: state.gymSessions,
        activeGymSession: state.activeGymSession,
        gymWeightUnit: state.gymWeightUnit,
        goals: state.goals,
        foodEntries: state.foodEntries,
        foodTargets: state.foodTargets,
        savedFoods: state.savedFoods,
        ideas: state.ideas,
      }),
    }
  )
);

// Responsibilities that should appear in pickers, filters, and capture —
// archived ones stay in the main array so history keeps its colors.
export function useActiveResponsibilities() {
  const responsibilities = useAppStore((s) => s.responsibilities);
  return useMemo(() => responsibilities.filter((r) => !r.archivedAt), [responsibilities]);
}

// Push slice changes to Supabase (debounced) so other devices pick them up
// on their next load. localStorage persistence above stays as the offline cache.
let sliceSyncTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== "undefined") {
  useAppStore.subscribe((state, prevState) => {
    if (!state.userId || applyingServerSlices) return;
    if (LOCAL_SLICE_KEYS.every((k) => state[k] === prevState[k])) return;
    if (sliceSyncTimer) clearTimeout(sliceSyncTimer);
    sliceSyncTimer = setTimeout(() => {
      const current = useAppStore.getState();
      if (!current.userId) return;
      getDb()?.from("app_state")
        .upsert({ user_id: current.userId, key: "local_slices", data: localSlices(current) as Json })
        .then(({ error }) => { if (error) console.error("app_state sync:", error.message); });
    }, 1500);
  });
}
