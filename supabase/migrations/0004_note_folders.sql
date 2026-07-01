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

alter table public.note_folders enable row level security;

drop policy if exists "own_note_folders" on public.note_folders;
create policy "own_note_folders" on public.note_folders
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists note_folders_user_sort on public.note_folders(user_id, sort_order);
create index if not exists notes_user_folder on public.notes(user_id, folder_id);

drop trigger if exists note_folders_updated_at on public.note_folders;
create trigger note_folders_updated_at before update on public.note_folders
  for each row execute function public.set_updated_at();
