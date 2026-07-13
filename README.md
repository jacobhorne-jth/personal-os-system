# Personal OS

A single-user personal operating system: calendar, tasks, notes, habits, gym, food, goals, and ideas in one place. Built to replace the Google Calendar + Todoist combo for daily planning.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Supabase** — tasks, notes, calendar items, lists, responsibilities
- **localStorage** (Zustand persist) — habits, gym, goals, food, ideas
- **FullCalendar** for the calendar surface
- **OpenAI** for natural-language capture parsing
- **Google Calendar API** for read-only import from personal + school accounts

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes for Google sync |
| `NEXT_PUBLIC_OWNER_USER_ID` | Your Supabase auth user id (single-user mode) |
| `OPENAI_API_KEY` | Capture parsing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth desktop-app credentials |
| `GOOGLE_REFRESH_TOKEN_PERSONAL` | Refresh token for personal Google account |
| `GOOGLE_REFRESH_TOKEN_SCHOOL` | Refresh token for school Google account |

### Database

Run the migrations in `supabase/migrations/` in order against your Supabase project (SQL Editor or `supabase db push`).

### Google Calendar sync

1. Create a Google Cloud project, enable the Calendar API, and create OAuth **Desktop app** credentials.
2. Generate a refresh token per account:
   ```bash
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-auth.mjs
   ```
   Sign into the account in the browser tab that opens, then copy the printed token into `.env.local` (`GOOGLE_REFRESH_TOKEN_PERSONAL` or `GOOGLE_REFRESH_TOKEN_SCHOOL`).
3. Events sync automatically on app load (throttled to every 15 minutes) and via **Settings → Google Calendar → Sync now**. Imported events are read-only `external_event` items covering the last 30 / next 90 days.

## Daily use notes

- **Recurring tasks**: capture with natural language ("gym every mon", "review notes every day"). Completing a recurring task advances its due date instead of finishing it. Edit or remove recurrence from the task detail page.
- **Capture**: the center action parses dates, times, recurrence, and `@responsibility` mentions locally; the review flow uses OpenAI for messier input.
- **Data locality**: tasks/notes/calendar/lists/responsibilities live in Supabase (cross-device); habits/gym/goals/food/ideas live in browser localStorage (single device).

## Deploy

Push to GitHub, import into Vercel, add every variable from `.env.example`, deploy. The app runs in single-user mode — no login flow — so keep the deployment URL private or add auth before sharing it.
