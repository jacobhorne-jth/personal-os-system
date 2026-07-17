import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEvents } from "@/lib/google/calendar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export async function POST() {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const tokens = [
    process.env.GOOGLE_REFRESH_TOKEN_PERSONAL,
    process.env.GOOGLE_REFRESH_TOKEN_SCHOOL,
  ].filter(Boolean) as string[];

  if (!tokens.length) {
    return NextResponse.json(
      { error: "No Google refresh tokens set. Add GOOGLE_REFRESH_TOKEN_PERSONAL or GOOGLE_REFRESH_TOKEN_SCHOOL to .env.local" },
      { status: 400 },
    );
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  );

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 90);

  let synced = 0;
  const errors: string[] = [];

  for (const token of tokens) {
    try {
      const events = await fetchEvents(token, timeMin, timeMax);

      for (const event of events) {
        if (!event.id || !event.summary) continue;

        // Skip events the user declined
        const selfAttendee = event.attendees?.find((a) => a.self);
        if (selfAttendee?.responseStatus === "declined") continue;

        // All-day events have date only; timed events have dateTime
        const startsAt = event.start?.dateTime ?? `${event.start?.date}T00:00:00`;
        const endsAt = event.end?.dateTime ?? `${event.end?.date}T23:59:59`;

        const { error } = await supabase.from("calendar_items").upsert(
          {
            user_id: userId,
            external_id: event.id,
            type: "external_event",
            title: event.summary,
            starts_at: startsAt,
            ends_at: endsAt,
            source: "google",
            location: event.location ?? null,
            notes: event.description ?? null,
            responsibility_id: null,
          },
          { onConflict: "user_id,external_id" },
        );

        if (error) {
          errors.push(`${event.summary}: ${error.message}`);
        } else {
          synced++;
        }
      }
    } catch (err) {
      errors.push(String(err));
    }
  }

  return NextResponse.json({ synced, errors });
}
