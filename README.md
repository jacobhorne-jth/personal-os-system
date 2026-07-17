# Personal OS

A single-user personal operating system: calendar, tasks, notes, habits, gym, food, goals, and ideas in one place. Built to replace the Google Calendar + Todoist combo for daily planning.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Supabase** — all data (tasks, notes, calendar, lists, responsibilities, habits, gym, goals, food, ideas) plus magic-link auth
- **localStorage** (Zustand persist) — offline cache for the habit/gym/goal/food/idea slices
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
| `OPENAI_API_KEY` | Capture parsing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth desktop-app credentials |
| `GOOGLE_REFRESH_TOKEN_PERSONAL` | Refresh token for personal Google account |
| `GOOGLE_REFRESH_TOKEN_SCHOOL` | Refresh token for school Google account |

### Auth

Sign-in is a Supabase magic link: enter your email on `/login`, click the link
in the email, and the session persists per device. Row level security restricts
every table to the signed-in user, so only accounts you create in the Supabase
dashboard (Authentication → Add user) can see or change anything.

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
- **Cross-device**: everything syncs through Supabase. The habit/gym/goal/food/idea slices also keep a localStorage cache and push changes up on a short debounce, so each device converges on next load.

## Deploy

1. Push to GitHub and import the repo into [Vercel](https://vercel.com).
2. Add every variable from `.env.example` in the Vercel project settings.
3. In Supabase → Authentication → URL Configuration, set the site URL to your Vercel domain and add `https://<your-domain>/auth/callback` to the redirect allow-list.
4. Deploy, open the URL, sign in with your email.

**Phone**: open the deployed URL in Safari/Chrome → Share → Add to Home Screen. The PWA manifest and service worker are already set up, so it installs as a fullscreen app.
