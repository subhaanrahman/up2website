# Migration Repair

When remote migration history doesn't match local (e.g. partner applied via MCP/Dashboard), run:

```bash
supabase migration repair --status reverted 20260318234458   # phantom migration
supabase migration repair --status applied 20260318190000
supabase migration repair --status applied 20260318200000
supabase db push
```

Do **not** `repair --applied` on a migration you want to push.

**Delete this file once migrations are stable and everyone uses `supabase db push` only.**
