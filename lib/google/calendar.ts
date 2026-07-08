import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

export type GoogleEvent = calendar_v3.Schema$Event;

function createClient(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

export async function fetchEvents(
  refreshToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleEvent[]> {
  const cal = createClient(refreshToken);
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });
  return res.data.items ?? [];
}
