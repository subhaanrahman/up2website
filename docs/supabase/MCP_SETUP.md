# Supabase MCP → Cursor

1. Go to [Supabase MCP Setup](https://supabase.com/docs/guides/getting-started/mcp)
2. Select **Cursor** as client; follow prompts
3. Authenticate via browser OAuth when prompted
4. In Cursor: **Settings > Tools & MCP** — Supabase should show connected. Restart if needed.

Schema changes still go through migration files + `supabase db push`. See `.cursor/rules/supabase-workflow.mdc`.
