-- Add external_id to calendar_items for Google Calendar dedup
alter table public.calendar_items
  add column if not exists external_id text;

-- Unique per user so we can upsert on (user_id, external_id).
-- NULL values don't conflict with each other in Postgres unique constraints,
-- so non-Google events (external_id IS NULL) are unaffected.
alter table public.calendar_items
  drop constraint if exists calendar_items_user_external_unique;

alter table public.calendar_items
  add constraint calendar_items_user_external_unique
  unique (user_id, external_id);
