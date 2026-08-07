import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEvents } from "@/lib/google/calendar";
import { calendarSourcesFromEnv, googleExternalId } from "@/lib/google/sources";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { importedCalendarResponsibility, responsibilityIdForImportedCalendar, UNLABELED_RESPONSIBILITY_ID } from "@/lib/responsibilities";
import type { Database } from "@/lib/types/database";
import type { CalendarItem, CaptureExtraction, Responsibility } from "@/lib/types/domain";

type GoogleCalendarReviewItem = Omit<CaptureExtraction, "id"> & {
  externalId: string;
  externalSource: "google_calendar";
};

function localId(externalId: string) {
  return `gcal-${externalId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120)}`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToText(value?: string | null) {
  if (!value) return "";
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function hrefsFromHtml(value?: string | null) {
  if (!value) return [];
  return Array.from(value.matchAll(/href=["']([^"']+)["']/gi), (match) => decodeHtmlEntities(match[1]));
}

function urlsFromText(value: string) {
  return Array.from(value.matchAll(/https?:\/\/[^\s<>"')]+/gi), (match) => match[0]);
}

function compactLines(lines: Array<string | false | null | undefined>) {
  return lines.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

function googleEventNotes(sourceName: string, event: CalendarItemSource) {
  const description = htmlToText(event.description);
  const conferenceData = event.conferenceData;
  const links = new Set<string>();
  for (const link of hrefsFromHtml(event.description)) links.add(link);
  for (const link of urlsFromText(description)) links.add(link);
  if (event.htmlLink) links.add(event.htmlLink);
  if (event.hangoutLink) links.add(event.hangoutLink);

  const conferenceLines = conferenceData?.entryPoints
    ?.map((entry) => {
      if (entry.uri) links.add(entry.uri);
      return compactLines([
        entry.entryPointType && `${entry.entryPointType}: ${entry.uri ?? entry.label ?? ""}`.trim(),
        entry.meetingCode && `Meeting code: ${entry.meetingCode}`,
        entry.passcode && `Passcode: ${entry.passcode}`,
        entry.accessCode && `Access code: ${entry.accessCode}`,
      ]).join("\n");
    })
    .filter(Boolean) ?? [];

  const attachmentLines = event.attachments
    ?.map((attachment) => compactLines([
      attachment.title ?? attachment.fileUrl,
      attachment.fileUrl,
    ]).join("\n"))
    .filter(Boolean) ?? [];

  const attendeeLines = event.attendees
    ?.map((attendee) => {
      const name = attendee.displayName || attendee.email || "Guest";
      const status = attendee.responseStatus ? ` (${attendee.responseStatus})` : "";
      return `${name}${status}`;
    })
    .filter(Boolean) ?? [];

  const sections: string[] = [];
  const detailLines = compactLines([
    `Source calendar: ${sourceName}`,
    event.location && `Location: ${event.location}`,
    event.organizer && `Organizer: ${event.organizer.displayName || event.organizer.email}`,
    event.creator && `Creator: ${event.creator.displayName || event.creator.email}`,
    event.status && `Status: ${event.status}`,
    event.visibility && event.visibility !== "default" && `Visibility: ${event.visibility}`,
    event.transparency && event.transparency !== "opaque" && `Availability: ${event.transparency}`,
  ]);
  if (detailLines.length) sections.push(detailLines.join("\n"));
  if (conferenceData?.conferenceSolution?.name || conferenceLines.length) {
    sections.push(compactLines([
      conferenceData?.conferenceSolution?.name && `Conference: ${conferenceData.conferenceSolution.name}`,
      ...conferenceLines,
    ]).join("\n"));
  }
  if (description) sections.push(`Description:\n${description}`);
  if (links.size) sections.push(`Links:\n${Array.from(links).join("\n")}`);
  if (attachmentLines.length) sections.push(`Attachments:\n${attachmentLines.join("\n")}`);
  if (attendeeLines.length) sections.push(`Guests:\n${attendeeLines.join("\n")}`);

  return sections.join("\n\n") || undefined;
}

type CalendarItemSource = Awaited<ReturnType<typeof fetchEvents>>[number];

function isUnconfirmedEvent(event: CalendarItemSource) {
  const selfAttendee = event.attendees?.find((a) => a.self);
  return event.status === "tentative" || selfAttendee?.responseStatus === "tentative" || selfAttendee?.responseStatus === "needsAction";
}

function googleCalendarReviewItem(input: {
  sourceName: string;
  event: CalendarItemSource;
  externalId: string;
  responsibilityId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
}): GoogleCalendarReviewItem {
  const responseStatus = input.event.attendees?.find((a) => a.self)?.responseStatus;
  const reason = responseStatus === "needsAction" ? "needs your response" : "is not confirmed";
  return {
    externalId: input.externalId,
    externalSource: "google_calendar",
    source: "calendar",
    sourceTitle: `${input.sourceName} calendar - ${input.event.summary}`,
    sourceDetail: input.notes,
    summary: `Review ${input.sourceName} calendar event: ${input.event.summary} ${reason}`,
    confidence: 0.85,
    status: "pending_review",
    decisions: {},
    proposedTasks: [],
    proposedEvents: [{
      title: input.event.summary ?? "Untitled event",
      type: "external_event",
      responsibilityId: input.responsibilityId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.event.location ?? undefined,
      notes: input.notes,
    }],
    proposedNotes: [],
    proposedListItems: [],
  };
}

export async function POST(req: Request) {
  const localPreview = process.env.NEXT_PUBLIC_LOCAL_PREVIEW === "1";
  let userId: string | null = process.env.PERSONAL_SYSTEM_LOCAL_USER_ID ?? null;

  if (!localPreview) {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!localPreview && !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const sources = calendarSourcesFromEnv();

  if (!sources.length) {
    return NextResponse.json(
      { error: "No Google Calendar sources set. Add GOOGLE_CALENDAR_SOURCES_JSON or GOOGLE_REFRESH_TOKEN_PERSONAL/SCHOOL/WORK to .env.local" },
      { status: 400 },
    );
  }

  const supabase = serviceKey
    ? createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : null;
  const body = await req.json().catch(() => ({})) as { responsibilities?: Responsibility[] };
  const responsibilities = Array.isArray(body.responsibilities) ? body.responsibilities : [];

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 90);

  let synced = 0;
  const errors: string[] = [];
  const items: CalendarItem[] = [];
  const reviewItems: GoogleCalendarReviewItem[] = [];
  const labels = sources.map((source) => importedCalendarResponsibility(source.name));

  for (const source of sources) {
    try {
      const events = await fetchEvents(source, timeMin, timeMax);

      for (const event of events) {
        if (!event.id || !event.summary) continue;
        if (event.status === "cancelled") continue;

        // Skip events the user declined
        const selfAttendee = event.attendees?.find((a) => a.self);
        if (selfAttendee?.responseStatus === "declined") continue;

        // All-day events have date only; timed events have dateTime
        const startsAt = event.start?.dateTime ?? `${event.start?.date}T00:00:00`;
        const endsAt = event.end?.dateTime ?? `${event.end?.date}T23:59:59`;
        const externalId = googleExternalId(source, event.id);
        const responsibilityId = responsibilityIdForImportedCalendar(
          source.name,
          `${event.summary} ${event.location ?? ""}`,
          responsibilities,
        );
        const notes = googleEventNotes(source.name, event);

        if (isUnconfirmedEvent(event)) {
          reviewItems.push(googleCalendarReviewItem({
            sourceName: source.name,
            event,
            externalId,
            responsibilityId,
            startsAt,
            endsAt,
            notes,
          }));
          synced++;
          continue;
        }

        items.push({
          id: localId(externalId),
          externalId,
          type: "external_event",
          title: event.summary,
          startsAt,
          endsAt,
          source: "google",
          location: event.location ?? undefined,
          notes,
          responsibilityId,
        });

        if (!supabase || !userId) {
          synced++;
          continue;
        }

        const { error } = await supabase.from("calendar_items").upsert(
          {
            user_id: userId,
            external_id: externalId,
            type: "external_event",
            title: event.summary,
            starts_at: startsAt,
            ends_at: endsAt,
            source: "google",
            location: event.location ?? null,
            notes: notes ?? null,
            responsibility_id: responsibilityId === UNLABELED_RESPONSIBILITY_ID ? null : responsibilityId,
          },
          { onConflict: "user_id,external_id" },
        );

        if (error) {
          errors.push(`${source.name} / ${event.summary}: ${error.message}`);
        } else {
          synced++;
        }
      }
    } catch (err) {
      errors.push(`${source.name}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    synced,
    errors,
    items: localPreview ? items : undefined,
    reviewItems,
    labels: localPreview ? labels : undefined,
  });
}
