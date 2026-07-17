-- Recurring calendar events: a master row carries the recurrence rule and the
-- dates of any deleted single occurrences; instances are expanded client-side.
alter table public.calendar_items add column if not exists recurrence text;
alter table public.calendar_items add column if not exists recurrence_exceptions jsonb not null default '[]';

-- Archive responsibilities at any time without losing their history
alter table public.responsibilities add column if not exists archived_at timestamptz;
