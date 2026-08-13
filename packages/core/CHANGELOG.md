# workflow-agent-cli

## 2.23.7

### Patch Changes

- fix(config): stop reserving common conventional-commit scope names by default
  - `DEFAULT_RESERVED_SCOPE_NAMES` no longer includes `test`, `docs`, `deps`, `build`, `ci`, or `create` — none of those collide with an actual `workflow` CLI command, and all are extremely common, legitimate scope names in real projects
  - The default reserved list is now just `["init", "config"]`, the only words that actually collide with top-level CLI commands
  - Projects with scopes named `test`/`docs`/`deps`/etc. no longer need to set `reservedScopeNames` at all to unblock validation after upgrading from 2.23.4/2.23.5
  - `workflow init` no longer needs to opt out via `reservedScopeNames: []`, since the new defaults don't collide with the bundled scope presets

## 2.23.6

### Patch Changes

- fix(config): make reserved scope names configurable again
  - Restore `reservedScopeNames` on `workflow.config.json`, `DEFAULT_RESERVED_SCOPE_NAMES`, and `validateScopeName()`, which were silently dropped in 2.23.4's schema rewrite
  - Projects that use words like `test`, `docs`, or `deps` as legitimate scopes (e.g. `chore(deps): bump lodash`) can now override the reserved list, including with `reservedScopeNames: []`, instead of having to rename established conventions
  - `workflow init` now scaffolds new projects with `reservedScopeNames: []` since the bundled scope presets themselves use words like `docs` and `build`

## 2.23.2

### Patch Changes

- fix(cli): handle ESLint "no files found" gracefully in verify command
  - Handle skippable errors (like "no files matching pattern") in runCheck and applyFix
  - Display skipped checks with ⏭️ indicator instead of failing
  - Prevent false failures when lint runs on empty directories

## 2.23.1

### Patch Changes

- 39361b9: Fix learn command validation issues:
  - Add migration, deprecation, performance, compatibility to FixCategoryEnum
  - Make DependencyVersionSchema.compatibleRange optional with default "\*"
  - Fix learn record categories to match FixCategoryEnum schema values
  - Replace invalid "tooling" tag category with "tool" in LIBRARY_TAG_MAP
  - Replace invalid "category" tag category with valid PatternTagSchema categories
  - Fix inferTagsFromContent to use valid tag categories

- Updated dependencies [39361b9]
  - @hawkinside_out/workflow-improvement-tracker@1.4.1

## 2.23.0

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

### Patch Changes

- Updated dependencies [403e8d1]
  - @hawkinside_out/workflow-improvement-tracker@1.4.0

## 2.22.12

### Patch Changes

- aea259f: Fix learn command validation issues:
  - Add migration, deprecation, performance, compatibility to FixCategoryEnum
  - Make DependencyVersionSchema.compatibleRange optional with default "\*"
  - Fix learn record categories to match FixCategoryEnum schema values
  - Replace invalid "tooling" tag category with "tool" in LIBRARY_TAG_MAP
  - Replace invalid "category" tag category with valid PatternTagSchema categories
  - Fix inferTagsFromContent to use valid tag categories
- Updated dependencies [aea259f]
  - @hawkinside_out/workflow-improvement-tracker@1.3.2

## 2.22.11

### Patch Changes

- ee219cd: Improve pattern save operation clarity by displaying file paths
  - Added explicit file path output when saving blueprints via learn:record and learn:capture commands
  - Added file path output when saving fix patterns via verify command
  - Makes it clear that patterns are saved to their respective directories (fixes/, blueprints/, solutions/)

## 2.22.10

### Patch Changes

- aca21b7: Add support for YAML and configuration files in solution capture
  - Added .yml, .yaml, .json, .md, .mdx to supported file extensions in CodeAnalyzer
  - Fixed schema test expectations for isPrivate default value (false)
  - Resolves issue where solution capture failed for .github/workflows directory and other config-based solutions

- Updated dependencies [aca21b7]
  - @hawkinside_out/workflow-improvement-tracker@1.3.1

## 2.21.1

### Patch Changes

- 27ae4b2: ### Bug Fixes
  - Fix `workflow:config` to default to show action (was missing required action argument)
  - Add missing scripts: `workflow:config-show`, `workflow:config-set`
  - Add `workflow:learn-config`, `workflow:learn-config-enable`, `workflow:learn-config-disable`
  - Add `workflow:learn-sync`, `workflow:learn-sync-push`, `workflow:learn-sync-pull`
  - Update SCRIPT_CATEGORIES with all new scripts

## 2.20.1

### Patch Changes

- ### Bug Fixes
  - Fix `workflow:config` to default to show action (was missing required action argument)
  - Add missing scripts: `workflow:config-show`, `workflow:config-set`
  - Add `workflow:learn-config`, `workflow:learn-config-enable`, `workflow:learn-config-disable`
  - Add `workflow:learn-sync`, `workflow:learn-sync-push`, `workflow:learn-sync-pull`
  - Update SCRIPT_CATEGORIES with all new scripts

## 2.20.0

### Minor Changes

- feat(scripts): auto-remove deprecated scripts on install/update

  BREAKING CHANGE: Old colon-style script names are now removed and replaced with new hyphen-style names on package install or update.

  **Changes:**
  - 44 deprecated script names are automatically removed from package.json
  - New hyphen-style scripts are added (e.g., `workflow:learn-list` instead of `workflow:learn:list`)
  - Version marker script `workflow:version` for tracking
  - New scripts for hooks, sync, and all CLI subcommands
  - Console output shows removed deprecated scripts with migration hint

  **Migration:**
  - Old scripts are automatically removed and replaced on install/update
  - Users see a warning about deprecated scripts being removed
  - Run `pnpm workflow-agent setup` for pnpm users

## 2.19.0

### Minor Changes

- refactor(cli): consolidate 32 commands into 6 command groups with subcommands

  This refactoring reduces cognitive load and improves CLI organization:

  **Command Groups:**
  - `workflow docs` - Documentation management (advisory, generate, update, validate)
  - `workflow solution` - Solution pattern management (create, list, show, search, apply, export, import, analyze)
  - `workflow learn` - Learning system (analyze, sync, status, stats, list, export, import, clean)
  - `workflow scope` - Scope management (add, remove, list, sync, analyze)
  - `workflow hooks` - Git hooks (install, uninstall, status, test)
  - `workflow sync` - Registry synchronization (push, pull, status)

  **Benefits:**
  - Intuitive command discovery with grouped subcommands
  - Consistent command patterns across all operations
  - Cleaner help output with organized command groups
  - Reduced top-level command clutter
  - Easier to extend with new subcommands
