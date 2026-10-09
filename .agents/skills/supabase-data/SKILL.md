---
name: supabase-data
description: Safely evolve Factory Wars Supabase schema, migrations, RPC, auth, RLS, and persistence contracts.
---

# Supabase and persisted data

Use for `supabase/`, server auth/routes/database code, online profile/game sync, and persisted save formats.

1. Trace the client, server, SQL function/table, and response path. Read deployment/setup docs before assuming environment behavior.
2. Compare `schema.sql`, `online_schema.sql`, and existing migrations. Add forward-compatible migrations for deployed databases; do not silently rewrite history.
3. Treat browser inputs and match results as untrusted. Check RLS, ownership, authorization, validation, idempotency, and server authority.
4. Include negative, boundary, retry/duplicate, and partial-failure behavior in the contract. Preserve local-save and online compatibility where applicable.
5. Never expose credentials or run remote changes without explicit authorization. State which checks need a configured local or remote Supabase project.
