# Codebase Memory MCP

TalentHub is prepared for codebase-memory-mcp indexing.

## Recommended Indexing

```bash
# From repository root, index in moderate mode for structural search.
codebase-memory-mcp index_repository --repo_path . --mode moderate
```

## What To Index

- `apps/web/src`
- `supabase/migrations`
- `supabase/schema.sql`
- `docs`

## What Not To Commit

- `.codebase-memory/`
- large graph databases or generated MCP outputs
- temporary indexing artifacts

## Usage Notes

Use graph search for functions, components and call paths before refactoring large pages. Re-index after large structural moves.
