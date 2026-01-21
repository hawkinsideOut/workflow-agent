# workflow-agent-cli

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
