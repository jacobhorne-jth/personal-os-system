-- Catch-up script: applies migrations 0003 → 0006 in one idempotent pass.
-- Safe to run repeatedly. Use this if the individual migration files were
-- never applied to the live project (0006 alone fails when note_folders
-- doesn't exist yet).

-- ── 0003: task recurrence ─────────────────────────────────────────────────────

alter table public.tasks add column if not exists recurrence text;

-- ── 0004: note folders ────────────────────────────────────────────────────────

create table if not exists public.note_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default 'blue',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.notes add column if not exists folder_id uuid references public.note_folders(id) on delete set null;

create index if not exists note_folders_user_sort on public.note_folders(user_id, sort_order);
create index if not exists notes_user_folder on public.notes(user_id, folder_id);

drop trigger if exists note_folders_updated_at on public.note_folders;
create trigger note_folders_updated_at before update on public.note_folders
  for each row execute function public.set_updated_at();

-- ── 0005: Google Calendar dedup ───────────────────────────────────────────────

alter table public.calendar_items add column if not exists external_id text;

alter table public.calendar_items drop constraint if exists calendar_items_user_external_unique;
alter table public.calendar_items
  add constraint calendar_items_user_external_unique unique (user_id, external_id);

-- ── 0006: app_state for cross-device slices ───────────────────────────────────

create table if not exists public.app_state (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at before update on public.app_state
  for each row execute function public.set_updated_at();

-- ── 0006: re-assert RLS everywhere ────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.responsibilities enable row level security;
alter table public.tasks            enable row level security;
alter table public.calendar_items   enable row level security;
alter table public.notes            enable row level security;
alter table public.lists            enable row level security;
alter table public.note_folders     enable row level security;
alter table public.app_state        enable row level security;

drop policy if exists "own_profile"          on public.profiles;
drop policy if exists "own_responsibilities" on public.responsibilities;
drop policy if exists "own_tasks"            on public.tasks;
drop policy if exists "own_calendar_items"   on public.calendar_items;
drop policy if exists "own_notes"            on public.notes;
drop policy if exists "own_lists"            on public.lists;
drop policy if exists "own_note_folders"     on public.note_folders;
drop policy if exists "own_app_state"        on public.app_state;

create policy "own_profile"          on public.profiles         using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own_responsibilities" on public.responsibilities  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_tasks"            on public.tasks             using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_calendar_items"   on public.calendar_items    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_notes"            on public.notes             using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_lists"            on public.lists             using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_note_folders"     on public.note_folders      using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_app_state"        on public.app_state         using (auth.uid() = user_id) with check (auth.uid() = user_id);
