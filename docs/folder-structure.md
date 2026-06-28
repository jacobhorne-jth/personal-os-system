# Folder Structure

```txt
app/
  home/                 Dashboard and today command center
  calendar/             Full calendar planning surface
  capture/              Universal quick capture
  inbox/                AI extraction review queue
  analytics/            Planned vs actual reporting
  r/[responsibilityId]/ Responsibility workspace
  task/[id]/            Task detail
  event/[id]/           Calendar item detail
components/
  calendar/             Timeline, FullCalendar wrapper, overlays
  capture/              Capture input and AI review components
  dashboard/            Home widgets
  layout/               Shell and navigation
  responsibilities/     Responsibility strips and workspace widgets
  tasks/                Task controls and lists
  time/                 Timer, logs, summaries
  ui/                   Shared primitives
lib/
  data/                 Temporary mock data
  stores/               Zustand stores
  supabase/             Supabase clients and typed queries
  types/                Domain types
supabase/
  migrations/           Postgres schema and RLS
```

Next implementation steps:

1. Add Supabase generated database types.
2. Replace mock data with React Query hooks.
3. Wrap the timeline with FullCalendar for week/month and drag/drop.
4. Add auth middleware and protected routes.
5. Implement capture persistence and AI extraction review commits.
