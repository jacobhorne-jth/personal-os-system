# Google Calendar Import Contract

Google Calendar is the meeting-invite source of truth. This app imports Google events into `calendar_items` as read-through calendar blocks.

## Import behavior

- Google events become `calendar_items.type = external_event`.
- `external_provider = google`, `external_id`, and `external_url` preserve source identity.
- Invite actions remain in Google Calendar.
- App-created planning blocks, deadlines, reminders, and logs remain native to this app.

## Sync behavior

1. Initial OAuth connection imports a bounded window, such as 90 days back and 180 days forward.
2. Incremental sync uses Google sync tokens.
3. Event updates upsert by `(user_id, external_provider, external_id)`.
4. Deleted Google events soft-delete or remove imported items.
5. Responsibility assignment can be inferred later, but import should not block on classification.

## Local env

Preferred multi-calendar config:

```env
GOOGLE_CALENDAR_SOURCES_JSON='[
  {"name":"Personal","refreshToken":"...","calendarId":"primary"},
  {"name":"School","refreshToken":"...","calendarId":"primary"},
  {"name":"Work","refreshToken":"...","calendarId":"some_calendar_id@group.calendar.google.com"}
]'
```

Legacy shorthand still works:

```env
GOOGLE_REFRESH_TOKEN_PERSONAL=...
GOOGLE_REFRESH_TOKEN_SCHOOL=...
GOOGLE_REFRESH_TOKEN_WORK=...
GOOGLE_CALENDAR_ID_PERSONAL=primary
GOOGLE_CALENDAR_ID_SCHOOL=primary
GOOGLE_CALENDAR_ID_WORK=primary
```

For Gmail review proposals:

```env
GMAIL_REFRESH_TOKEN_PERSONAL=...
GMAIL_REFRESH_TOKEN_SCHOOL=...
GMAIL_REFRESH_TOKEN_WORK=...
OPENAI_API_KEY=...
```

Run `GOOGLE_AUTH_SCOPE=both node scripts/google-auth.mjs` to generate a token that can read both Calendar and Gmail.
