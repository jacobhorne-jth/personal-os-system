export type GoogleCalendarSource = {
  name: string;
  refreshToken: string;
  calendarId: string;
};

function compactName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sourceFromJson(raw: string): GoogleCalendarSource[] {
  const parsed = JSON.parse(raw) as Array<{ name?: string; refreshToken?: string; calendarId?: string }>;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry) => entry.refreshToken)
    .map((entry, index) => ({
      name: entry.name?.trim() || `Calendar ${index + 1}`,
      refreshToken: entry.refreshToken!,
      calendarId: entry.calendarId?.trim() || "primary",
    }));
}

export function calendarSourcesFromEnv(): GoogleCalendarSource[] {
  const rawJson = process.env.GOOGLE_CALENDAR_SOURCES_JSON ?? process.env.GOOGLE_CALENDAR_SOURCES;
  if (rawJson?.trim()) {
    try {
      const sources = sourceFromJson(rawJson);
      if (sources.length > 0) return sources;
    } catch {
      // Fall through to legacy environment variables.
    }
  }

  return [
    {
      name: "Personal",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN_PERSONAL,
      calendarId: process.env.GOOGLE_CALENDAR_ID_PERSONAL || "primary",
    },
    {
      name: "School",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN_SCHOOL,
      calendarId: process.env.GOOGLE_CALENDAR_ID_SCHOOL || "primary",
    },
    {
      name: "Work",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN_WORK,
      calendarId: process.env.GOOGLE_CALENDAR_ID_WORK || "primary",
    },
  ].filter((source): source is GoogleCalendarSource => Boolean(source.refreshToken));
}

export function googleSourceKey(source: Pick<GoogleCalendarSource, "name" | "calendarId">) {
  return `${compactName(source.name) || "calendar"}:${source.calendarId}`;
}

export function googleExternalId(source: Pick<GoogleCalendarSource, "name" | "calendarId">, eventId: string) {
  return `${googleSourceKey(source)}:${eventId}`;
}
