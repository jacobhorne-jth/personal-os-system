import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEvents } from "@/lib/google/calendar";
import { calendarSourcesFromEnv, googleExternalId } from "@/lib/google/sources";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { inferResponsibilityId, UNLABELED_RESPONSIBILITY_ID } from "@/lib/responsibilities";
import type { Database } from "@/lib/types/database";
import type { CalendarItem, Responsibility } from "@/lib/types/domain";

function localId(externalId: string) {
  return `gcal-${externalId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120)}`;
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

  for (const source of sources) {
    try {
      const events = await fetchEvents(source, timeMin, timeMax);

      for (const event of events) {
        if (!event.id || !event.summary) continue;

        // Skip events the user declined
        const selfAttendee = event.attendees?.find((a) => a.self);
        if (selfAttendee?.responseStatus === "declined") continue;

        // All-day events have date only; timed events have dateTime
        const startsAt = event.start?.dateTime ?? `${event.start?.date}T00:00:00`;
        const endsAt = event.end?.dateTime ?? `${event.end?.date}T23:59:59`;
        const externalId = googleExternalId(source, event.id);
        const responsibilityId = inferResponsibilityId(
          `${event.summary} ${event.location ?? ""} ${source.name}`,
          responsibilities,
        );

        items.push({
          id: localId(externalId),
          externalId,
          type: "external_event",
          title: event.summary,
          startsAt,
          endsAt,
          source: "google",
          location: event.location ?? undefined,
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
            notes: null,
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

  return NextResponse.json({ synced, errors, items: localPreview ? items : undefined });
}
