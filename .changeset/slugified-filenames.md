---
"workflow-agent-cli": minor
"@hawkinside_out/workflow-improvement-tracker": minor
---

feat: implement slugified filenames for patterns

Pattern files now use human-readable slugified filenames while maintaining UUIDs for identity:
- Old format: `{uuid}.json`
- New format: `{slug}-{uuid}.json` (e.g., `fix-memory-leak-abc123.json`)

Key features:
- Automatic migration: patterns are renamed when saved
- Backwards compatible: get/delete operations support both formats
- New `workflow migrate filenames` command with `--dry-run` option
- Name validation prevents empty slugs
- 50-character slug limit for filesystem compatibility

This is not a breaking change for most users as migration is automatic, but pattern filenames will change which may affect custom tooling that relies on the old format.
