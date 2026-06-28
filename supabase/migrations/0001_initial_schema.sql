create extension if not exists "pgcrypto";

create type public.responsibility_color as enum ('blue', 'mint', 'coral', 'amber', 'violet');
create type public.task_status as enum ('todo', 'doing', 'done', 'archived');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.calendar_item_type as enum (
  'external_event',
  'app_event',
  'task_due',
  'deadline',
  'time_block',
  'time_log',
  'reminder'
);
create type public.capture_source as enum ('typed', 'voice', 'upload', 'paste', 'quick_task', 'time_log');
create type public.ai_extraction_status as enum ('pending_review', 'approved', 'rejected', 'partially_approved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color public.responsibility_color not null default 'blue',
  icon text not null default 'Circle',
  weekly_goal_minutes integer not null default 0,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  notes text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  recurrence_rule text,
  estimate_minutes integer,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
  type public.calendar_item_type not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  recurrence_rule text,
  source text not null default 'app',
  external_provider text,
  external_id text,
  external_url text,
  location text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete set null,
  title text not null,
  body text not null default '',
  source_capture_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  storage_bucket text not null default 'uploads',
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete set null,
  source public.capture_source not null,
  raw_text text,
  file_id uuid references public.files(id) on delete set null,
  status text not null default 'captured',
  created_at timestamptz not null default now()
);

create table public.ai_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade,
  model text,
  status public.ai_extraction_status not null default 'pending_review',
  confidence numeric(4,3),
  proposed_changes jsonb not null,
  approved_changes jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  calendar_item_id uuid references public.calendar_items(id) on delete set null,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  check (ended_at >= started_at)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility_id uuid references public.responsibilities(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null,
  checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index responsibilities_user_idx on public.responsibilities(user_id);
create index tasks_user_due_idx on public.tasks(user_id, due_at);
create index calendar_items_user_starts_idx on public.calendar_items(user_id, starts_at);
create index calendar_items_external_idx on public.calendar_items(user_id, external_provider, external_id);
create index time_logs_user_started_idx on public.time_logs(user_id, started_at);
create index ai_extractions_review_idx on public.ai_extractions(user_id, status, created_at);

alter table public.profiles enable row level security;
alter table public.responsibilities enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_items enable row level security;
alter table public.notes enable row level security;
alter table public.files enable row level security;
alter table public.captures enable row level security;
alter table public.ai_extractions enable row level security;
alter table public.time_logs enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "Users manage own profiles" on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage own responsibilities" on public.responsibilities
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own tasks" on public.tasks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own calendar items" on public.calendar_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own notes" on public.notes
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own files" on public.files
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own captures" on public.captures
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own ai extractions" on public.ai_extractions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own time logs" on public.time_logs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own lists" on public.lists
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own list items" on public.list_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
