import type { CalendarItemType, TaskPriority } from "@/lib/types/domain";

export type ProposedTaskChange = {
  action: "create_task";
  title: string;
  responsibilitySlug?: string;
  dueAt?: string;
  priority?: TaskPriority;
  notes?: string;
  estimateMinutes?: number;
};

export type ProposedCalendarChange = {
  action: "create_calendar_item";
  title: string;
  type: CalendarItemType;
  responsibilitySlug?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  notes?: string;
};

export type ProposedNoteChange = {
  action: "create_note";
  title: string;
  responsibilitySlug?: string;
  body: string;
};

export type ProposedTimeLogChange = {
  action: "create_time_log";
  title: string;
  responsibilitySlug?: string;
  startedAt: string;
  endedAt: string;
  notes?: string;
};

export type AiExtractionPayload = {
  summary: string;
  confidence: number;
  assumptions: string[];
  proposedChanges: Array<ProposedTaskChange | ProposedCalendarChange | ProposedNoteChange | ProposedTimeLogChange>;
};

export const aiParserSystemPrompt = `
You parse messy personal capture input into proposed changes for a calendar-first personal operating system.

Rules:
- Never claim the changes were committed.
- Prefer responsibility/category assignment when clear, otherwise leave it unset.
- Preserve uncertainty in assumptions.
- Use ISO timestamps when dates and times can be inferred.
- Return only JSON matching the extraction payload.
`;
