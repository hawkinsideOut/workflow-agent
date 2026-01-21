# workflow-agent-cli

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
