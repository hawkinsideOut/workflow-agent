# Copilot Instructions for workflow-agent

## Project Overview

This is a **pnpm monorepo** for a self-evolving workflow management system. The CLI tool (`workflow-agent-cli`) enforces branch naming, commit conventions, and includes an AI-powered learning system for capturing/sharing code patterns.

## Architecture

```
packages/
├── core/           # Main CLI (workflow-agent-cli) - validation, commands, config
├── improvement-tracker/  # Pattern capture & learning system
├── github-app/     # GitHub App for auto-healing CI/CD pipelines
├── vscode-extension/  # VS Code real-time validation
├── scopes-*/       # Preset scope packages (saas, library, api, ecommerce, cms)
├── registry-api/   # Scope registry API
└── docs/           # Next.js documentation site
```

**Key data flow**: CLI commands → validators → config loading via cosmiconfig → scope discovery from `scopes-*` packages

## Essential Commands

```bash
pnpm install        # Install all workspace dependencies
pnpm build          # Build all packages (core first, then others)
pnpm test           # Run vitest tests across all packages
pnpm typecheck      # TypeScript checking for all packages
pnpm lint && pnpm format  # ESLint + Prettier

# Pre-commit (MANDATORY before any commit):
./scripts/pre-commit-checks.sh   # Or: pnpm verify:fix
```

## Critical Workflow Rules

### Pre-Commit Mandate

**Zero exceptions** - Before ANY commit, run `./scripts/pre-commit-checks.sh` or `pnpm verify:fix`. This runs:

1. Type check → 2. Lint → 3. Format → 4. Test → 5. Build

If any step fails, fix it and re-run **all checks from step 1**.

### Branch & Commit Conventions

- **Branch format**: `<type>/<scope>/<description>` (e.g., `feature/cli/add-sync-command`)
- **Commit format**: `type(scope): description` (conventional commits)
- **Types**: `feature`, `fix`, `docs`, `test`, `refactor`, `chore`
- **Core scopes**: `cli`, `validators`, `presets`, `templates`, `docs`, `vscode`, `core`

## Code Patterns

### Adding CLI Commands

New commands go in `packages/core/src/cli/commands/`. Follow the pattern:

```typescript
// packages/core/src/cli/commands/my-command.ts
import type { Command } from "commander";
import * as p from "@clack/prompts"; // Always use @clack/prompts for interactive CLI

export function registerMyCommand(program: Command): void {
  program
    .command("my-command")
    .description("Command description")
    .action(async () => {
      p.intro("Starting command...");
      // Command logic
      p.outro("Done!");
    });
}
```

### Validators

Validators are in `packages/core/src/validators/`. They return `ValidationResult`:

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string; // Used for did-you-mean corrections
}
```

### Configuration Loading

Config is loaded via cosmiconfig from multiple sources. Use `loadConfigSafe()` for graceful error handling:

```typescript
import { loadConfigSafe } from "../config/index.js";
const { config, issues, valid } = await loadConfigSafe(cwd);
```

### Scope Discovery

Custom scopes are auto-discovered from `packages/scopes-*` directories. The cache invalidates after 5 minutes.

## Testing Conventions

- Test files are **co-located** with source: `my-feature.ts` → `my-feature.unit.test.ts` or `my-feature.e2e.test.ts`
- Use `vitest` for all tests
- E2E tests use real file system operations with temp directories

## File Naming

| Type         | Convention                          | Example                         |
| ------------ | ----------------------------------- | ------------------------------- |
| Source files | kebab-case                          | `branch-validator.ts`           |
| Test files   | `*.unit.test.ts` or `*.e2e.test.ts` | `hooks.e2e.test.ts`             |
| Templates    | UPPER_SNAKE_CASE                    | `AGENT_EDITING_INSTRUCTIONS.md` |

## Important Files

- [workflow.config.json](../workflow.config.json) - Root config with project scopes
- [packages/core/src/cli/commands/](../packages/core/src/cli/commands/) - All CLI commands
- [packages/core/src/validators/](../packages/core/src/validators/) - Validation logic
- [templates/SINGLE_SOURCE_OF_TRUTH.md](../templates/SINGLE_SOURCE_OF_TRUTH.md) - Canonical locations template
- [docs/PRE_COMMIT_WORKFLOW.md](../docs/PRE_COMMIT_WORKFLOW.md) - Full pre-commit policy

## Common Pitfalls

1. **ES Modules**: All packages use `"type": "module"`. Use `.js` extensions in imports: `import { x } from "./file.js"`
2. **Workspace dependencies**: Use `workspace:^` for internal dependencies in package.json
3. **Export changes**: Run `scripts/detect-export-changes.sh` when modifying public APIs
4. **pnpm postinstall**: pnpm blocks postinstall scripts - users must run `pnpm workflow-agent setup` manually

## Improvement Tracking

Store improvement suggestions in `.workflow/improvements/` as JSON files. When capturing patterns, use the solution commands:

- `workflow-agent solution:capture` - Capture working code
- `workflow-agent solution:search` - Find existing patterns
