# Supabase Implementation Notes

## Environment

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Auth

The prototype supports magic-link auth. Middleware protects app routes only when Supabase env vars exist, which keeps local design work frictionless before a project is provisioned.

## Query migration path

The current UI reads from `lib/data/mock.ts` through query-style functions. Replace those functions with Supabase reads in this order:

1. `responsibilities`
2. `calendar_items`
3. `tasks`
4. `captures`
5. `ai_extractions`
6. `time_logs`

The UI should not import Supabase directly. Components should call hooks/functions from `lib/queries`.
