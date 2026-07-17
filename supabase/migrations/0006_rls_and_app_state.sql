-- Re-assert row level security on every table. Writes with the publishable key
-- and no session were succeeding, which means RLS was disabled at some point
-- (likely while auth was stripped during development). This locks everything
-- back down before the app is deployed to a public URL.

alter table public.profiles         enable row level security;
alter table public.responsibilities enable row level security;
alter table public.tasks            enable row level security;
alter table public.calendar_items   enable row level security;
alter table public.notes            enable row level security;
alter table public.lists            enable row level security;
alter table public.note_folders     enable row level security;

drop policy if exists "own_profile"          on public.profiles;
drop policy if exists "own_responsibilities" on public.responsibilities;
drop policy if exists "own_tasks"            on public.tasks;
drop policy if exists "own_calendar_items"   on public.calendar_items;
drop policy if exists "own_notes"            on public.notes;
drop policy if exists "own_lists"            on public.lists;
drop policy if exists "own_note_folders"     on public.note_folders;

create policy "own_profile"          on public.profiles         using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own_responsibilities" on public.responsibilities  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_tasks"            on public.tasks             using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_calendar_items"   on public.calendar_items    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_notes"            on public.notes             using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_lists"            on public.lists             using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_note_folders"     on public.note_folders      using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Key-value store for the client-side slices (habits, gym, goals, food, ideas)
-- so they sync across devices instead of living in one browser's localStorage.

create table if not exists public.app_state (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

drop policy if exists "own_app_state" on public.app_state;
create policy "own_app_state" on public.app_state using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at before update on public.app_state for each row execute function public.set_updated_at();
