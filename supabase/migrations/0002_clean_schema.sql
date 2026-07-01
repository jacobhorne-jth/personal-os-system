-- Migration 0002: clean schema matching domain types
-- Drops the v1 schema and replaces it with a simpler structure
-- that maps directly to domain types (text slugs for responsibility IDs,
-- jsonb for subtasks/list items, text[] for labels).

-- Drop old tables
drop table if exists public.ai_extractions cascade;
drop table if exists public.captures cascade;
drop table if exists public.time_logs cascade;
drop table if exists public.files cascade;
drop table if exists public.list_items cascade;
drop table if exists public.lists cascade;
drop table if exists public.notes cascade;
drop table if exists public.calendar_items cascade;
drop table if exists public.tasks cascade;
drop table if exists public.responsibilities cascade;
drop table if exists public.profiles cascade;

-- Drop old enums
drop type if exists public.responsibility_color cascade;
drop type if exists public.task_status cascade;
drop type if exists public.task_priority cascade;
drop type if exists public.calendar_item_type cascade;
drop type if exists public.capture_source cascade;
drop type if exists public.ai_extraction_status cascade;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone     text not null default 'America/Los_Angeles',
  created_at   timestamptz not null default now()
);

-- Responsibilities use a text slug as ID (e.g. "school", "capital-one").
-- Composite PK (user_id, id) so the same slug can exist for different users.
create table public.responsibilities (
  id               text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  description      text not null default '',
  color            text not null default 'blue',
  icon             text not null default 'Circle',
  weekly_goal_hours numeric not null default 0,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  primary key (user_id, id)
);

-- responsibility_id is a plain text slug with no FK (allows responsibilities
-- to be managed independently and keeps queries simple).
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  responsibility_id text,
  title             text not null,
  description       text,
  status            text not null default 'todo',
  priority          text not null default 'medium',
  due_at            timestamptz,
  labels            text[] not null default '{}',
  subtasks          jsonb not null default '[]',
  estimate_minutes  integer,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.calendar_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  responsibility_id text,
  type              text not null,
  title             text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  source            text not null default 'app',
  location          text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  responsibility_id text,
  title             text not null,
  body              text not null default '',
  labels            text[] not null default '{}',
  last_opened_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- List items stored as jsonb array: [{ id, title, done }]
create table public.lists (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  responsibility_id text,
  title             text not null,
  items             jsonb not null default '[]',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.responsibilities enable row level security;
alter table public.tasks            enable row level security;
alter table public.calendar_items   enable row level security;
alter table public.notes            enable row level security;
alter table public.lists            enable row level security;

create policy "own_profile"          on public.profiles        using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own_responsibilities" on public.responsibilities using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_tasks"            on public.tasks            using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_calendar_items"   on public.calendar_items   using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_notes"            on public.notes            using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_lists"            on public.lists            using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index tasks_user_due           on public.tasks(user_id, due_at);
create index tasks_user_resp          on public.tasks(user_id, responsibility_id);
create index calendar_user_starts     on public.calendar_items(user_id, starts_at);
create index calendar_user_resp       on public.calendar_items(user_id, responsibility_id);
create index notes_user_updated       on public.notes(user_id, updated_at desc);
create index lists_user_resp          on public.lists(user_id, responsibility_id);

-- ─── Auto-update updated_at ──────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at          before update on public.tasks          for each row execute function public.set_updated_at();
create trigger calendar_items_updated_at before update on public.calendar_items for each row execute function public.set_updated_at();
create trigger notes_updated_at          before update on public.notes          for each row execute function public.set_updated_at();
create trigger lists_updated_at          before update on public.lists          for each row execute function public.set_updated_at();
