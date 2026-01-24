# @hawkinside_out/workflow-improvement-tracker

## 1.4.1

### Patch Changes

- 39361b9: Fix learn command validation issues:
  - Add migration, deprecation, performance, compatibility to FixCategoryEnum
  - Make DependencyVersionSchema.compatibleRange optional with default "\*"
  - Fix learn record categories to match FixCategoryEnum schema values
  - Replace invalid "tooling" tag category with "tool" in LIBRARY_TAG_MAP
  - Replace invalid "category" tag category with valid PatternTagSchema categories
  - Fix inferTagsFromContent to use valid tag categories

## 1.4.0

### Minor Changes

- 403e8d1: feat: implement slugified filenames for patterns

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

## 1.3.2

### Patch Changes

- aea259f: Fix learn command validation issues:
  - Add migration, deprecation, performance, compatibility to FixCategoryEnum
  - Make DependencyVersionSchema.compatibleRange optional with default "\*"
  - Fix learn record categories to match FixCategoryEnum schema values
  - Replace invalid "tooling" tag category with "tool" in LIBRARY_TAG_MAP
  - Replace invalid "category" tag category with valid PatternTagSchema categories
  - Fix inferTagsFromContent to use valid tag categories

## 1.3.1

### Patch Changes

- aca21b7: Add support for YAML and configuration files in solution capture
  - Added .yml, .yaml, .json, .md, .mdx to supported file extensions in CodeAnalyzer
  - Fixed schema test expectations for isPrivate default value (false)
  - Resolves issue where solution capture failed for .github/workflows directory and other config-based solutions
