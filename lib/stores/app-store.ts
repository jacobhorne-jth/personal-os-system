"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { aiReviewItems, calendarItems, lists, responsibilities, tasks } from "@/lib/data/mock";
import type { CalendarItem, CaptureExtraction, FileAsset, Note, Responsibility, ResponsibilityColor, SavedList, Task } from "@/lib/types/domain";

type TimerState = {
  running: boolean;
  responsibilityId: string;
  title: string;
  startedAt?: string;
};

type AppState = {
  responsibilities: Responsibility[];
  calendarItems: CalendarItem[];
  tasks: Task[];
  aiReviewItems: CaptureExtraction[];
  notes: Note[];
  files: FileAsset[];
  lists: SavedList[];
  timer: TimerState;
  addCaptureExtraction: (input: { text: string; source: CaptureExtraction["source"]; responsibilityId: string }) => void;
  addCalendarItem: (input: Omit<CalendarItem, "id" | "source"> & { source?: CalendarItem["source"] }) => void;
  updateCalendarItem: (itemId: string, input: Partial<Omit<CalendarItem, "id">>) => void;
  deleteCalendarItem: (itemId: string) => void;
  addTask: (input: { title: string; responsibilityId?: string; dueAt?: string; description?: string; labels?: string[]; priority?: Task["priority"] }) => void;
  updateTask: (taskId: string, input: Partial<Omit<Task, "id" | "subtasks">>) => void;
  deleteTask: (taskId: string) => void;
  addNote: (input: { title: string; body: string; responsibilityId: string; labels?: string[] }) => string;
  updateNote: (noteId: string, input: Partial<Omit<Note, "id" | "createdAt">>) => void;
  markNoteOpened: (noteId: string) => void;
  deleteNote: (noteId: string) => void;
  addList: (input: { title: string; responsibilityId: string }) => void;
  addListItem: (input: { listId: string; title: string }) => void;
  toggleListItem: (listId: string, itemId: string) => void;
  addMockFile: (input: { filename: string; responsibilityId: string }) => void;
  updateResponsibilityColor: (responsibilityId: string, color: ResponsibilityColor) => void;
  setExtractionDecision: (extractionId: string, itemId: string, approved: boolean) => void;
  commitExtraction: (extractionId: string) => void;
  toggleTask: (taskId: string) => void;
  moveCalendarItem: (itemId: string, startsAt: string, endsAt?: string) => void;
  setTimerResponsibility: (responsibilityId: string) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  addManualTimeLog: (input: { title: string; responsibilityId: string; startedAt: string; endedAt: string }) => void;
};

const now = "2026-05-07T10:00:00-07:00";

const seedNotes: Note[] = [
  {
    id: "note-1",
    title: "Runtime comparison idea",
    body: "Compare latest runtime curves against FEA baseline before poster submission.",
    responsibilityId: "digital-learning-lab",
    labels: ["research"],
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  },
  {
    id: "note-2",
    title: "Algorithms exam review",
    body: "Prioritize dynamic programming, graph traversal, and proof templates.",
    responsibilityId: "school",
    labels: ["class notes"],
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  },
  {
    id: "note-3",
    title: "Quarter structure",
    body: "Keep School as the operating area; track classes as notes and lists because they change every quarter.",
    responsibilityId: "school",
    labels: ["class notes"],
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  },
  {
    id: "note-4",
    title: "Recruiting buckets",
    body: "Apps, events, Leetcode, interviews, and resume tweaks should stay visible as recurring lists.",
    responsibilityId: "recruiting",
    labels: ["follow-up"],
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  }
];

const seedFiles: FileAsset[] = [
  {
    id: "file-1",
    filename: "research-poster-draft.pdf",
    mimeType: "application/pdf",
    sizeLabel: "2.4 MB",
    responsibilityId: "digital-learning-lab",
    createdAt: now
  },
  {
    id: "file-2",
    filename: "syllabus-algorithms.pdf",
    mimeType: "application/pdf",
    sizeLabel: "720 KB",
    responsibilityId: "school",
    createdAt: now
  }
];

function id(prefix: string) {
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
      : [
          {
            title: isReminder ? text.replace(/^remind me to /i, "") : text || "New captured task",
            priority: lower.includes("urgent") || lower.includes("friday") ? "high" : "medium",
            responsibilityId: input.responsibilityId,
            dueAt: lower.includes("tomorrow") ? "2026-05-08T17:00:00-07:00" : undefined
          }
        ],
    proposedEvents: isMeeting
      ? [
          {
            title: text,
            type: "app_event",
            responsibilityId: input.responsibilityId,
            startsAt: "2026-05-12T14:00:00-07:00",
            endsAt: "2026-05-12T14:45:00-07:00"
          }
        ]
      : isTimeLog
        ? [
            {
              title: text.replace(/^log /i, "") || "Captured time log",
              type: "time_log",
              responsibilityId: input.responsibilityId,
              startsAt: "2026-05-07T14:00:00-07:00",
              endsAt: "2026-05-07T16:00:00-07:00"
            }
          ]
        : [],
    proposedNotes: lower.includes("note") || lower.includes("compare")
      ? [
          {
            title: "Captured note",
            body: text,
            responsibilityId: input.responsibilityId
          }
        ]
      : [],
    proposedListItems: listMatch && listItemTitle && listTitle
      ? [
          {
            listTitle: `${listTitle.charAt(0).toUpperCase()}${listTitle.slice(1)}`,
            itemTitle: `${listItemTitle.charAt(0).toUpperCase()}${listItemTitle.slice(1)}`,
            responsibilityId: input.responsibilityId
          }
        ]
      : []
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      responsibilities,
      calendarItems,
      tasks,
      aiReviewItems: aiReviewItems.map((item) => ({ ...item, status: "pending_review", decisions: {} })),
      notes: seedNotes,
      files: seedFiles,
      lists,
      timer: {
        running: false,
        responsibilityId: "digital-learning-lab",
        title: "Focus session"
      },
      addCaptureExtraction: (input) =>
        set((state) => ({
          aiReviewItems: [parseCapture(input), ...state.aiReviewItems]
        })),
      addCalendarItem: (input) =>
        set((state) => ({
          calendarItems: [
            {
              id: id("evt"),
              title: input.title,
              type: input.type,
              responsibilityId: input.responsibilityId,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              source: input.source ?? "app",
              location: input.location,
              notes: input.notes
            },
            ...state.calendarItems
          ],
          responsibilities: state.responsibilities.map((responsibility) =>
            responsibility.id === input.responsibilityId
              ? { ...responsibility, upcomingCount: responsibility.upcomingCount + 1 }
              : responsibility
          )
        })),
      updateCalendarItem: (itemId, input) =>
        set((state) => ({
          calendarItems: state.calendarItems.map((item) => (item.id === itemId ? { ...item, ...input } : item))
        })),
      deleteCalendarItem: (itemId) =>
        set((state) => ({
          calendarItems: state.calendarItems.filter((item) => item.id !== itemId)
        })),
      addTask: (input) =>
        set((state) => ({
          tasks: [
            {
              id: id("task"),
              title: input.title,
              description: input.description,
              responsibilityId: input.responsibilityId,
              dueAt: input.dueAt,
              priority: input.priority ?? "medium",
              status: "todo",
              labels: input.labels ?? [],
              estimateMinutes: 30,
              subtasks: []
            },
            ...state.tasks
          ],
          responsibilities: state.responsibilities.map((responsibility) =>
            input.responsibilityId && responsibility.id === input.responsibilityId
              ? { ...responsibility, taskCount: responsibility.taskCount + 1 }
              : responsibility
          )
        })),
      updateTask: (taskId, input) =>
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...input } : task))
        })),
      deleteTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId)
        })),
      addNote: (input) => {
        const noteId = id("note");
        const timestamp = new Date().toISOString();
        set((state) => ({
          notes: [
            {
              id: noteId,
              title: input.title,
              body: input.body,
              responsibilityId: input.responsibilityId,
              labels: input.labels ?? [],
              createdAt: timestamp,
              updatedAt: timestamp,
              lastOpenedAt: timestamp
            },
            ...state.notes
          ]
        }));
        return noteId;
      },
      updateNote: (noteId, input) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  ...input,
                  updatedAt: new Date().toISOString()
                }
              : note
          )
        })),
      markNoteOpened: (noteId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  lastOpenedAt: new Date().toISOString()
                }
              : note
          )
        })),
      deleteNote: (noteId) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== noteId)
        })),
      addList: (input) =>
        set((state) => ({
          lists: [
            {
              id: id("list"),
              title: input.title,
              responsibilityId: input.responsibilityId,
              updatedAt: new Date().toISOString(),
              items: []
            },
            ...state.lists
          ]
        })),
      addListItem: (input) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === input.listId
              ? {
                  ...list,
                  updatedAt: new Date().toISOString(),
                  items: [
                    ...list.items,
                    {
                      id: id("list-item"),
                      title: input.title,
                      done: false
                    }
                  ]
                }
              : list
          )
        })),
      toggleListItem: (listId, itemId) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  updatedAt: new Date().toISOString(),
                  items: list.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
                }
              : list
          )
        })),
      addMockFile: (input) =>
        set((state) => ({
          files: [
            {
              id: id("file"),
              filename: input.filename,
              mimeType: input.filename.endsWith(".pdf") ? "application/pdf" : "text/plain",
              sizeLabel: "Local mock",
              responsibilityId: input.responsibilityId,
              createdAt: new Date().toISOString()
            },
            ...state.files
          ]
        })),
      updateResponsibilityColor: (responsibilityId, color) =>
        set((state) => ({
          responsibilities: state.responsibilities.map((responsibility) =>
            responsibility.id === responsibilityId ? { ...responsibility, color } : responsibility
          )
        })),
      setExtractionDecision: (extractionId, itemId, approved) =>
        set((state) => ({
          aiReviewItems: state.aiReviewItems.map((item) =>
            item.id === extractionId
              ? {
                  ...item,
                  decisions: {
                    ...item.decisions,
                    [itemId]: approved
                  },
                  status: "partially_approved"
                }
              : item
          )
        })),
      commitExtraction: (extractionId) => {
        const extraction = get().aiReviewItems.find((item) => item.id === extractionId);
        if (!extraction) {
          return;
        }

        const shouldCommit = (kind: string, title: string) => extraction.decisions?.[`${kind}-${title}`] !== false;

        const newTasks: Task[] = extraction.proposedTasks.filter((task) => shouldCommit("task", task.title)).map((task) => ({
          id: id("task"),
          title: task.title,
          responsibilityId: task.responsibilityId,
          dueAt: task.dueAt,
          priority: task.priority,
          status: "todo",
          labels: [],
          estimateMinutes: 30,
          subtasks: []
        }));

        const newEvents: CalendarItem[] = extraction.proposedEvents.filter((event) => shouldCommit("event", event.title)).map((event) => ({
          id: id("evt"),
          title: event.title,
          type: event.type,
          responsibilityId: event.responsibilityId,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          source: "ai_review"
        }));

        const newNotes: Note[] = extraction.proposedNotes.filter((note) => shouldCommit("note", note.title)).map((note) => ({
          id: id("note"),
          title: note.title,
          body: note.body,
          responsibilityId: note.responsibilityId,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString()
        }));
        const newListItems = (extraction.proposedListItems ?? []).filter((item) => shouldCommit("list", `${item.listTitle}:${item.itemTitle}`));

        set((state) => ({
          tasks: [...newTasks, ...state.tasks],
          calendarItems: [...newEvents, ...state.calendarItems],
          notes: [...newNotes, ...state.notes],
          lists: newListItems.reduce((currentLists, listItem) => {
            const existingList = currentLists.find((list) => list.title.toLowerCase() === listItem.listTitle.toLowerCase());
            if (existingList) {
              return currentLists.map((list) =>
                list.id === existingList.id
                  ? {
                      ...list,
                      updatedAt: new Date().toISOString(),
                      items: [
                        ...list.items,
                        {
                          id: id("list-item"),
                          title: listItem.itemTitle,
                          done: false
                        }
                      ]
                    }
                  : list
              );
            }

            return [
              {
                id: id("list"),
                title: listItem.listTitle,
                responsibilityId: listItem.responsibilityId,
                updatedAt: new Date().toISOString(),
                items: [
                  {
                    id: id("list-item"),
                    title: listItem.itemTitle,
                    done: false
                  }
                ]
              },
              ...currentLists
            ];
          }, state.lists),
          aiReviewItems: state.aiReviewItems.map((item) => (item.id === extractionId ? { ...item, status: "approved" } : item))
        }));
      },
      toggleTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, status: task.status === "done" ? "todo" : "done" } : task
          )
        })),
      moveCalendarItem: (itemId, startsAt, endsAt) =>
        set((state) => ({
          calendarItems: state.calendarItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  startsAt,
                  endsAt: endsAt ?? item.endsAt
                }
              : item
          )
        })),
      setTimerResponsibility: (responsibilityId) => set((state) => ({ timer: { ...state.timer, responsibilityId } })),
      startTimer: () => set((state) => ({ timer: { ...state.timer, running: true, startedAt: new Date().toISOString() } })),
      pauseTimer: () => set((state) => ({ timer: { ...state.timer, running: false } })),
      stopTimer: () => {
        const { timer } = get();
        if (!timer.startedAt) {
          set((state) => ({ timer: { ...state.timer, running: false } }));
          return;
        }

        const endedAt = new Date().toISOString();
        get().addManualTimeLog({
          title: timer.title,
          responsibilityId: timer.responsibilityId,
          startedAt: timer.startedAt,
          endedAt
        });
        set((state) => ({ timer: { ...state.timer, running: false, startedAt: undefined } }));
      },
      addManualTimeLog: (input) =>
        set((state) => ({
          calendarItems: [
            {
              id: id("log"),
              title: input.title,
              type: "time_log",
              responsibilityId: input.responsibilityId,
              startsAt: input.startedAt,
              endsAt: input.endedAt,
              source: "app"
            },
            ...state.calendarItems
          ]
        }))
    }),
    {
      name: "jacob-os-local-state-v6",
      partialize: (state) => ({
        calendarItems: state.calendarItems,
        responsibilities: state.responsibilities,
        tasks: state.tasks,
        aiReviewItems: state.aiReviewItems,
        notes: state.notes,
        files: state.files,
        lists: state.lists,
        timer: state.timer
      })
    }
  )
);
