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
