import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { GoogleCalendarSource } from "@/lib/google/sources";

export type GoogleEvent = calendar_v3.Schema$Event;

export function createGoogleOAuthClient(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

export async function fetchEvents(
  source: GoogleCalendarSource,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleEvent[]> {
  const auth = createGoogleOAuthClient(source.refreshToken);
  const cal = google.calendar({ version: "v3", auth });
  const res = await cal.events.list({
    calendarId: source.calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });
  return res.data.items ?? [];
}
