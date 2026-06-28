import type { CalendarItem, CaptureExtraction, Responsibility, SavedList, Task } from "@/lib/types/domain";

export const responsibilities: Responsibility[] = [
  {
    id: "personal",
    name: "Life",
    description: "Life admin, personal, errands, planning, and personal routines.",
    color: "sage",
    icon: "User",
    weeklyGoalHours: 6,
    actualHoursThisWeek: 3.5,
    plannedHoursThisWeek: 5,
    taskCount: 4,
    upcomingCount: 2
  },
  {
    id: "school",
    name: "School",
    description: "CS 180B, PHRMSCI H90, SOC SCI H1E, CS 178, and quarter-specific academic work.",
    color: "blueberry",
    icon: "GraduationCap",
    weeklyGoalHours: 18,
    actualHoursThisWeek: 14.5,
    plannedHoursThisWeek: 19,
    taskCount: 8,
    upcomingCount: 3
  },
  {
    id: "commit-the-change",
    name: "Commit the Change",
    description: "Club projects, client work, meetings, and delivery follow-through.",
    color: "tangerine",
    icon: "UsersRound",
    weeklyGoalHours: 4,
    actualHoursThisWeek: 2,
    plannedHoursThisWeek: 4,
    taskCount: 3,
    upcomingCount: 2
  },
  {
    id: "caretech",
    name: "CareTech @ UCI",
    description: "Healthcare tech projects, club tasks, meetings, and outreach.",
    color: "sage",
    icon: "HeartPulse",
    weeklyGoalHours: 3,
    actualHoursThisWeek: 1.5,
    plannedHoursThisWeek: 3,
    taskCount: 2,
    upcomingCount: 1
  },
  {
    id: "blockchain-uci",
    name: "Blockchain @ UCI",
    description: "Blockchain club meetings, events, workshops, and project work.",
    color: "grape",
    icon: "Blocks",
    weeklyGoalHours: 3,
    actualHoursThisWeek: 1,
    plannedHoursThisWeek: 2,
    taskCount: 2,
    upcomingCount: 1
  },
  {
    id: "maiss",
    name: "MAISS",
    description: "AI student society events, planning, and club commitments.",
    color: "lavender",
    icon: "Sparkles",
    weeklyGoalHours: 2,
    actualHoursThisWeek: 0.5,
    plannedHoursThisWeek: 2,
    taskCount: 1,
    upcomingCount: 1
  },
  {
    id: "digital-learning-lab",
    name: "Research",
    description: "Research, runtime analysis, papers, experiments, and lab meetings.",
    color: "basil",
    icon: "Microscope",
    weeklyGoalHours: 8,
    actualHoursThisWeek: 6,
    plannedHoursThisWeek: 8,
    taskCount: 5,
    upcomingCount: 3
  },
  {
    id: "calit2",
    name: "Calit2",
    description: "Calit2 project work, admin, meetings, and collaboration blocks.",
    color: "violet",
    icon: "Building2",
    weeklyGoalHours: 6,
    actualHoursThisWeek: 3,
    plannedHoursThisWeek: 5,
    taskCount: 3,
    upcomingCount: 2
  },
  {
    id: "capital-one",
    name: "Capital One",
    description: "Work blocks, deliverables, meetings, and follow-ups.",
    color: "tomato",
    icon: "BriefcaseBusiness",
    weeklyGoalHours: 20,
    actualHoursThisWeek: 12,
    plannedHoursThisWeek: 18,
    taskCount: 4,
    upcomingCount: 3
  },
  {
    id: "recruiting",
    name: "Recruiting",
    description: "Apps, events, Leetcode, interviews, resume tweaks, and follow-ups.",
    color: "peacock",
    icon: "UserRoundSearch",
    weeklyGoalHours: 6,
    actualHoursThisWeek: 3.5,
    plannedHoursThisWeek: 5,
    taskCount: 5,
    upcomingCount: 2
  },
  {
    id: "projects",
    name: "Projects",
    description: "Apps, experiments, writing, and creative builds.",
    color: "amber",
    icon: "Rocket",
    weeklyGoalHours: 7,
    actualHoursThisWeek: 4,
    plannedHoursThisWeek: 6,
    taskCount: 4,
    upcomingCount: 2
  },
  {
    id: "leetcode",
    name: "LeetCode",
    description: "Daily practice, interview patterns, contest review, and problem notes.",
    color: "amber",
    icon: "Code2",
    weeklyGoalHours: 5,
    actualHoursThisWeek: 2,
    plannedHoursThisWeek: 5,
    taskCount: 3,
    upcomingCount: 2
  },
  {
    id: "gym",
    name: "Gym",
    description: "Workout splits, sessions, bodyweight, nutrition-adjacent habits, and PRs.",
    color: "mint",
    icon: "Dumbbell",
    weeklyGoalHours: 5,
    actualHoursThisWeek: 3,
    plannedHoursThisWeek: 5,
    taskCount: 2,
    upcomingCount: 3
  }
];

export const calendarItems: CalendarItem[] = [
  {
    id: "evt-capital-one-mon",
    title: "Capital One Work",
    type: "time_block",
    responsibilityId: "capital-one",
    startsAt: "2026-06-22T09:00:00-04:00",
    endsAt: "2026-06-22T17:00:00-04:00",
    source: "app",
    location: "Remote"
  },
  {
    id: "evt-capital-one-tue",
    title: "Capital One Work",
    type: "time_block",
    responsibilityId: "capital-one",
    startsAt: "2026-06-23T09:00:00-04:00",
    endsAt: "2026-06-23T17:00:00-04:00",
    source: "app",
    location: "Remote"
  },
  {
    id: "evt-capital-one-wed",
    title: "Capital One Work",
    type: "time_block",
    responsibilityId: "capital-one",
    startsAt: "2026-06-24T09:00:00-04:00",
    endsAt: "2026-06-24T17:00:00-04:00",
    source: "app",
    location: "Remote"
  },
  {
    id: "evt-capital-one-thu",
    title: "Capital One Work",
    type: "time_block",
    responsibilityId: "capital-one",
    startsAt: "2026-06-25T09:00:00-04:00",
    endsAt: "2026-06-25T17:00:00-04:00",
    source: "app",
    location: "Remote"
  },
  {
    id: "evt-capital-one-fri",
    title: "Capital One Work",
    type: "time_block",
    responsibilityId: "capital-one",
    startsAt: "2026-06-26T09:00:00-04:00",
    endsAt: "2026-06-26T17:00:00-04:00",
    source: "app",
    location: "Remote"
  },
  {
    id: "evt-gym-mon",
    title: "Gym - Push",
    type: "time_block",
    responsibilityId: "gym",
    startsAt: "2026-06-22T19:00:00-04:00",
    endsAt: "2026-06-22T20:15:00-04:00",
    source: "app",
    location: "Gym"
  },
  {
    id: "evt-gym-wed",
    title: "Gym - Pull",
    type: "time_block",
    responsibilityId: "gym",
    startsAt: "2026-06-24T19:00:00-04:00",
    endsAt: "2026-06-24T20:15:00-04:00",
    source: "app",
    location: "Gym"
  },
  {
    id: "evt-gym-fri",
    title: "Gym - Legs",
    type: "time_block",
    responsibilityId: "gym",
    startsAt: "2026-06-26T19:00:00-04:00",
    endsAt: "2026-06-26T20:15:00-04:00",
    source: "app",
    location: "Gym"
  },
  {
    id: "evt-leetcode-tue",
    title: "LeetCode patterns",
    type: "time_block",
    responsibilityId: "leetcode",
    startsAt: "2026-06-23T20:00:00-04:00",
    endsAt: "2026-06-23T21:00:00-04:00",
    source: "app",
    location: "Desk"
  },
  {
    id: "evt-leetcode-thu",
    title: "LeetCode review",
    type: "time_block",
    responsibilityId: "leetcode",
    startsAt: "2026-06-25T20:00:00-04:00",
    endsAt: "2026-06-25T21:00:00-04:00",
    source: "app",
    location: "Desk"
  },
  {
    id: "evt-1",
    title: "Digital Learning Lab meeting",
    type: "app_event",
    responsibilityId: "digital-learning-lab",
    startsAt: "2026-05-07T09:30:00-07:00",
    endsAt: "2026-05-07T10:15:00-07:00",
    source: "app",
    location: "Zoom",
    notes: "Weekly research sync and poster review."
  },
  {
    id: "evt-2",
    title: "Poster edit block",
    type: "time_block",
    responsibilityId: "digital-learning-lab",
    startsAt: "2026-05-07T11:00:00-07:00",
    endsAt: "2026-05-07T12:30:00-07:00",
    source: "app",
    location: "Library",
    notes: "Protected block for poster edits."
  },
  {
    id: "evt-3",
    title: "Algorithms problem set due",
    type: "deadline",
    responsibilityId: "school",
    startsAt: "2026-05-07T15:00:00-07:00",
    endsAt: "2026-05-07T15:15:00-07:00",
    source: "app",
    location: "Canvas",
    notes: "Submit the algorithms problem set."
  },
  {
    id: "evt-4",
    title: "Capital One work block",
    type: "time_block",
    responsibilityId: "capital-one",
    startsAt: "2026-05-07T16:00:00-07:00",
    endsAt: "2026-05-07T17:00:00-07:00",
    source: "app",
    location: "Remote"
  },
  {
    id: "evt-5",
    title: "Workout logged",
    type: "time_log",
    responsibilityId: "personal",
    startsAt: "2026-05-07T18:00:00-07:00",
    endsAt: "2026-05-07T18:45:00-07:00",
    source: "app",
    location: "ARC"
  },
  {
    id: "evt-6",
    title: "Recruiting coffee chat",
    type: "app_event",
    responsibilityId: "recruiting",
    startsAt: "2026-05-08T10:00:00-07:00",
    endsAt: "2026-05-08T10:30:00-07:00",
    source: "app",
    location: "Video call",
    notes: "Ask about team placement and intern project scope."
  },
  {
    id: "evt-7",
    title: "Personal OS build session",
    type: "time_block",
    responsibilityId: "projects",
    startsAt: "2026-05-08T14:00:00-07:00",
    endsAt: "2026-05-08T16:00:00-07:00",
    source: "app",
    location: "Desk"
  },
  {
    id: "evt-8",
    title: "Rent autopay check",
    type: "reminder",
    responsibilityId: "personal",
    startsAt: "2026-05-09T09:00:00-07:00",
    endsAt: "2026-05-09T09:10:00-07:00",
    source: "app",
    location: "Home"
  },
  {
    id: "evt-9",
    title: "Calit2 standup",
    type: "app_event",
    responsibilityId: "calit2",
    startsAt: "2026-05-07T13:00:00-07:00",
    endsAt: "2026-05-07T13:30:00-07:00",
    source: "app",
    location: "Conference room",
    notes: "Quick project status check."
  },
  {
    id: "evt-10",
    title: "Sleep review",
    type: "app_event",
    responsibilityId: "personal",
    startsAt: "2026-05-08T19:00:00-07:00",
    endsAt: "2026-05-08T19:20:00-07:00",
    source: "app",
    location: "Home"
  },
  {
    id: "evt-11",
    title: "Capital One interview prep",
    type: "time_block",
    responsibilityId: "recruiting",
    startsAt: "2026-05-09T11:00:00-07:00",
    endsAt: "2026-05-09T12:00:00-07:00",
    source: "app",
    location: "Desk",
    notes: "Review behavioral stories and project examples."
  },
  {
    id: "evt-12",
    title: "Flight to Bay Area",
    type: "app_event",
    responsibilityId: "personal",
    startsAt: "2026-05-10T08:30:00-07:00",
    endsAt: "2026-05-10T10:00:00-07:00",
    source: "app",
    location: "SNA",
    notes: "Pack charger, ID, headphones, and presentation clothes."
  }
];

export const lists: SavedList[] = [
  {
    id: "list-1",
    title: "Recruiting Pipeline",
    responsibilityId: "recruiting",
    updatedAt: "2026-05-07T09:00:00-07:00",
    items: [
      { id: "list-1-item-1", title: "Apps to submit", done: false },
      { id: "list-1-item-2", title: "Events to attend", done: false },
      { id: "list-1-item-3", title: "Resume tweaks", done: true }
    ]
  },
  {
    id: "list-2",
    title: "School Classes",
    responsibilityId: "school",
    updatedAt: "2026-05-07T08:30:00-07:00",
    items: [
      { id: "list-2-item-1", title: "CS 180B", done: false },
      { id: "list-2-item-2", title: "PHRMSCI H90", done: false },
      { id: "list-2-item-3", title: "SOC SCI H1E", done: false },
      { id: "list-2-item-4", title: "CS 178", done: false }
    ]
  },
  {
    id: "list-3",
    title: "Commit the Change",
    responsibilityId: "commit-the-change",
    updatedAt: "2026-05-06T17:00:00-07:00",
    items: [
      { id: "list-3-item-1", title: "Check project board", done: false },
      { id: "list-3-item-2", title: "Follow up on client scope", done: false },
      { id: "list-3-item-3", title: "Prep next meeting notes", done: true }
    ]
  },
  {
    id: "list-4",
    title: "CareTech",
    responsibilityId: "caretech",
    updatedAt: "2026-05-06T16:00:00-07:00",
    items: [
      { id: "list-4-item-1", title: "Review health project backlog", done: false },
      { id: "list-4-item-2", title: "Message team about demo", done: false }
    ]
  },
  {
    id: "list-5",
    title: "Blockchain Events",
    responsibilityId: "blockchain-uci",
    updatedAt: "2026-05-06T15:00:00-07:00",
    items: [
      { id: "list-5-item-1", title: "Workshop ideas", done: false },
      { id: "list-5-item-2", title: "Meeting reminders", done: true }
    ]
  },
  {
    id: "list-6",
    title: "Research Threads",
    responsibilityId: "digital-learning-lab",
    updatedAt: "2026-05-07T11:30:00-07:00",
    items: [
      { id: "list-6-item-1", title: "Runtime comparison", done: false },
      { id: "list-6-item-2", title: "Poster edits", done: false },
      { id: "list-6-item-3", title: "FEA baseline", done: true }
    ]
  },
  {
    id: "list-7",
    title: "Groceries",
    responsibilityId: "personal",
    updatedAt: "2026-05-07T12:30:00-07:00",
    items: [
      { id: "list-7-item-1", title: "Greek yogurt", done: false },
      { id: "list-7-item-2", title: "Eggs", done: false },
      { id: "list-7-item-3", title: "Spinach", done: false },
      { id: "list-7-item-4", title: "Coffee", done: true }
    ]
  }
];

export const tasks: Task[] = [
  {
    id: "task-capital-notes",
    title: "Finish Capital One project notes",
    description: "Capture the open decisions and next handoff items before Monday.",
    responsibilityId: "capital-one",
    dueAt: "2026-06-27T17:00:00-04:00",
    priority: "high",
    status: "todo",
    labels: ["deep work", "writing"],
    estimateMinutes: 60,
    subtasks: []
  },
  {
    id: "task-leetcode-bs",
    title: "Do 2 binary search problems",
    responsibilityId: "leetcode",
    dueAt: "2026-06-27T20:00:00-04:00",
    priority: "medium",
    status: "todo",
    labels: ["coding", "deep work"],
    estimateMinutes: 50,
    subtasks: []
  },
  {
    id: "task-gym-push",
    title: "Log push workout",
    responsibilityId: "gym",
    dueAt: "2026-06-27T21:00:00-04:00",
    priority: "medium",
    status: "todo",
    labels: ["quick"],
    estimateMinutes: 10,
    subtasks: []
  },
  {
    id: "task-research-paper",
    title: "Read research paper",
    responsibilityId: "digital-learning-lab",
    dueAt: "2026-06-28T16:00:00-04:00",
    priority: "medium",
    status: "todo",
    labels: ["deep work", "reading"],
    estimateMinutes: 75,
    subtasks: []
  },
  {
    id: "task-recruiter-follow-up",
    title: "Follow up with recruiter",
    responsibilityId: "recruiting",
    dueAt: "2026-06-26T15:00:00-04:00",
    priority: "urgent",
    status: "todo",
    labels: ["urgent", "follow-up", "email"],
    estimateMinutes: 15,
    subtasks: []
  },
  {
    id: "task-groceries",
    title: "Buy groceries",
    responsibilityId: "personal",
    dueAt: "2026-06-27T18:00:00-04:00",
    priority: "low",
    status: "todo",
    labels: ["errand", "quick"],
    estimateMinutes: 35,
    subtasks: []
  },
  {
    id: "task-inbox-1",
    title: "Figure out July travel dates",
    description: "Captured without a responsibility so it stays in Inbox.",
    dueAt: "2026-06-29T17:00:00-04:00",
    priority: "medium",
    status: "todo",
    labels: ["waiting"],
    estimateMinutes: 20,
    subtasks: []
  },
  {
    id: "task-1",
    title: "Finish poster edits",
    description: "Update the runtime plot, tighten the results section, and send the draft.",
    responsibilityId: "digital-learning-lab",
    dueAt: "2026-05-08T17:00:00-07:00",
    priority: "high",
    status: "doing",
    labels: ["deep work", "writing"],
    estimateMinutes: 90,
    subtasks: [
      { id: "sub-1", title: "Update runtime plot", done: true },
      { id: "sub-2", title: "Send draft to Ali", done: false }
    ]
  },
  {
    id: "task-2",
    title: "Review algorithms lecture notes",
    description: "Focus on dynamic programming and proof templates.",
    responsibilityId: "school",
    dueAt: "2026-05-07T20:00:00-07:00",
    priority: "medium",
    status: "todo",
    labels: ["deep work"],
    estimateMinutes: 45,
    subtasks: []
  },
  {
    id: "task-3",
    title: "Book dentist appointment",
    responsibilityId: "personal",
    priority: "low",
    status: "todo",
    labels: ["errand"],
    estimateMinutes: 10,
    subtasks: []
  },
  {
    id: "task-4",
    title: "Send Capital One thank-you note",
    description: "Keep it short and mention the most useful part of the conversation.",
    responsibilityId: "capital-one",
    dueAt: "2026-05-07T18:00:00-07:00",
    priority: "medium",
    status: "todo",
    labels: ["email", "follow-up"],
    estimateMinutes: 15,
    subtasks: []
  },
  {
    id: "task-5",
    title: "Clean resume project bullets",
    description: "Make the Personal OS and research bullets measurable.",
    responsibilityId: "recruiting",
    dueAt: "2026-05-09T12:00:00-07:00",
    priority: "medium",
    status: "doing",
    labels: ["writing"],
    estimateMinutes: 45,
    subtasks: []
  },
  {
    id: "task-6",
    title: "Draft capture flow copy",
    responsibilityId: "projects",
    dueAt: "2026-05-08T21:00:00-07:00",
    priority: "low",
    status: "todo",
    labels: ["writing"],
    estimateMinutes: 30,
    subtasks: []
  },
  {
    id: "task-7",
    title: "Update Calit2 project notes",
    responsibilityId: "calit2",
    dueAt: "2026-05-10T17:00:00-07:00",
    priority: "medium",
    status: "todo",
    labels: ["writing"],
    estimateMinutes: 25,
    subtasks: []
  },
  {
    id: "task-8",
    title: "Schedule next week workouts",
    responsibilityId: "personal",
    dueAt: "2026-05-11T09:00:00-07:00",
    priority: "low",
    status: "todo",
    labels: ["quick"],
    estimateMinutes: 20,
    subtasks: []
  },
  {
    id: "task-9",
    title: "Prep Commit the Change meeting notes",
    responsibilityId: "commit-the-change",
    dueAt: "2026-05-08T18:00:00-07:00",
    priority: "medium",
    status: "todo",
    labels: ["follow-up"],
    estimateMinutes: 20,
    subtasks: []
  },
  {
    id: "task-10",
    title: "Check CareTech demo status",
    responsibilityId: "caretech",
    dueAt: "2026-05-09T15:00:00-07:00",
    priority: "low",
    status: "todo",
    labels: ["quick"],
    estimateMinutes: 15,
    subtasks: []
  },
  {
    id: "task-11",
    title: "Review Blockchain workshop ideas",
    responsibilityId: "blockchain-uci",
    dueAt: "2026-05-10T12:00:00-07:00",
    priority: "low",
    status: "todo",
    labels: ["coding"],
    estimateMinutes: 25,
    subtasks: []
  }
];

export const aiReviewItems: CaptureExtraction[] = [
  {
    id: "cap-1",
    source: "paste",
    summary: "Meeting notes from research sync",
    confidence: 0.86,
    proposedTasks: [
      {
        title: "Compare runtime against FEA",
        responsibilityId: "digital-learning-lab",
        priority: "high",
        dueAt: "2026-05-10T17:00:00-07:00"
      },
      {
        title: "Email Ali updated poster",
        responsibilityId: "digital-learning-lab",
        priority: "medium"
      }
    ],
    proposedEvents: [
      {
        title: "Research meeting",
        type: "app_event",
        responsibilityId: "digital-learning-lab",
        startsAt: "2026-05-12T14:00:00-07:00",
        endsAt: "2026-05-12T14:45:00-07:00"
      }
    ],
    proposedNotes: [
      {
        title: "Runtime comparison idea",
        body: "Compare latest runtime curves against FEA baseline before poster submission.",
        responsibilityId: "digital-learning-lab"
      }
    ]
  }
];
