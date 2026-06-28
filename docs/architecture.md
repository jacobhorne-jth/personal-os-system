# Personal Life Operating System Architecture

## Product stance

This is calendar-first personal operations software. The main object is not a page or a document; it is time connected to responsibilities. Tasks, deadlines, imported Google Calendar events, planned blocks, reminders, and actual time logs all appear in one calendar surface.

## Core loops

1. Plan the day from `/home`.
2. Capture anything with the center action from anywhere.
3. Review AI-suggested changes before committing them.
4. Work inside a responsibility workspace when focus is needed.
5. Compare planned vs actual time in analytics.

## Route map

- `/login`: magic-link auth. In local prototype mode, this can pass through without Supabase env vars.
- `/home`: dashboard, today timeline, due tasks, responsibilities, AI review queue, time summary.
- `/calendar`: day, week, and month planning surface with overlays.
- `/capture`: typed, voice, upload, paste, quick task, and time log intake.
- `/inbox`: AI extraction review, approval, rejection, and edits.
- `/analytics`: planned vs actual time, responsibility trends, deadline pressure.
- `/r/[responsibilityId]`: focused workspace with overview, tasks, calendar, notes, files, analytics.
- `/task/[id]`: task detail, subtasks, attachments, time logs.
- `/event/[id]`: event detail and Google Calendar handoff when external.

## Data ownership

Every user-created object belongs to a user. Most objects optionally belong to a responsibility. This keeps capture low friction because uncategorized input can exist, then AI or the user can classify it during review.

## AI rule

The AI never writes directly into tasks, calendar items, notes, files, or time logs. It writes proposed changes into `ai_extractions`. The review UI shows a PR-like diff. Only approved changes are committed.

## Google Calendar model

Google Calendar remains the invite source of truth. Imported events are stored as `calendar_items` with `type = external_event`, `external_provider = google`, `external_id`, and `external_url`. The app can show them, filter them, and link out to Google Calendar for invite actions.

## PWA and widgets

The app should expose compact, query-friendly endpoints for future widgets:

- Today overview: events, due tasks, active timer.
- Quick capture: a minimal POST target.
- Upcoming deadlines: next deadline items by responsibility.
- Responsibility widget: one responsibility summary.
- Time tracking widget: active timer and weekly totals.

On iPhone and Mac, the first PWA priority is fast launch into `/capture` and `/home`.

The prototype includes a web manifest, service worker, and app shortcuts. Native iOS widgets would later read from the same compact widget endpoints.
