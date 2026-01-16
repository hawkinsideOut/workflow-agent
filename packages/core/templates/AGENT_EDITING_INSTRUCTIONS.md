# Agent Editing Instructions

> **Purpose**: This document defines the rules and patterns that AI agents (GitHub Copilot, Claude, etc.) must follow when making edits to this codebase. Following these guidelines ensures consistency, prevents regressions, and maintains architectural integrity.

---

## Table of Contents

1. [Implementation Plans](#implementation-plans)
2. [Required File Checklists by Change Type](#required-file-checklists-by-change-type)
3. [Coding Standards](#coding-standards)
4. [Architecture Rules](#architecture-rules)
5. [Library Usage Policy](#library-usage-policy)
6. [Testing Requirements](#testing-requirements)
7. [PR Workflow](#pr-workflow)

---

## Implementation Plans

### ⚠️ MANDATORY: Create Branch BEFORE Implementation

**Before starting ANY implementation plan work, you MUST:**

1. Ensure you are on `main` and it is up to date:

   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a new feature branch:

   ```bash
   git checkout -b <type>/<scope>/<short-description>
   ```

3. Only THEN begin creating the implementation plan and making code changes

> 🚫 **NEVER** start implementing a plan while on `main`. All implementation work MUST be on a dedicated feature branch.

### When to Create an Implementation Plan

Create an implementation plan for any work that:

- Touches **more than 3 files**
- Implements a **new feature** (not a simple bugfix)
- Requires **multiple related changes** across the codebase
- Will be completed over **multiple sessions**
- Involves **database migrations** or schema changes

### File Location and Naming

| Type            | Location           | Naming Convention            |
| --------------- | ------------------ | ---------------------------- |
| Active plans    | `plans/`           | `<FEATURE_NAME>_PLAN.md`     |
| Completed plans | `plans/completed/` | Same name, moved after merge |

**Naming examples:**

- `plans/DUE_DATE_REMINDERS_PLAN.md`
- `plans/TEAM_PERMISSIONS_PLAN.md`
- `plans/NOTIFICATION_REFACTOR_PLAN.md`

### Required Structure

Every implementation plan MUST follow this template:

```markdown
# Implementation Plan: <Feature Name>

> **Status**: 🟡 In Progress | 🟢 Complete | 🔴 Blocked  
> **Created**: YYYY-MM-DD  
> **Last Updated**: YYYY-MM-DD  
> **Branch**: `feature/<scope>/<description>`

## Overview

Brief description of what is being implemented and why.

## Checklist

### Phase 1: <Phase Name>

- [ ] Task description — `path/to/file.ts`
- [ ] Task description — `path/to/file.ts`

### Phase 2: <Phase Name>

- [ ] Task description — `path/to/file.ts`
- [ ] Task description — `path/to/file.ts`

### Testing

- [ ] Unit tests added
- [ ] E2E tests added (if applicable)
- [ ] Manual testing completed

### Documentation

- [ ] Types updated in `types/index.ts`
- [ ] LIBRARY_INVENTORY.md updated (if new deps)

## Notes

Any decisions, blockers, or context for future reference.
```

### Progress Update Rules

**Agent MUST update the implementation plan as work progresses:**

1. **Mark items complete** — Change `- [ ]` to `- [x]` immediately after completing each task
2. **Update "Last Updated" date** — Refresh timestamp on every modification
3. **Update "Status"** — Change from 🟡 to 🟢 when all items complete, or 🔴 if blocked
4. **Add notes** — Document any deviations, decisions, or blockers in the Notes section

### Pushing Changes After Implementation

**After completing implementation work, you MUST push to the feature branch:**

1. **Verify all changes are ready:**

   ```bash
   pnpm build     # Must pass
   pnpm lint      # Must be clean
   pnpm test      # Must pass
   ```

2. **Stage and commit changes:**

   ```bash
   git add .
   git commit -m "<type>(<scope>): <description>"
   ```

3. **Push to the feature branch:**

   ```bash
   git push origin <branch-name>
   ```

4. **Create a Pull Request** for review and merge to `main`

> ⚠️ **IMPORTANT**: Never push directly to `main`. Always push to your feature branch and create a PR.

---

## 🚨 MANDATORY PRE-COMMIT CHECKLIST - ZERO EXCEPTIONS

> **CRITICAL RULE**: This is a "one-and-done" service commitment. The following pre-commit checks are MANDATORY before ANY commit and push. There are ZERO EXCEPTIONS to this rule.

### The Rule

**Before EVERY commit and push, Agent MUST:**

1. ✅ **Run all pre-commit checks** (listed below)
2. 🔧 **Fix ALL errors encountered** automatically
3. 🔄 **Re-run checks** until all pass
4. ✅ **Only then commit and push**

### Pre-Commit Execution Sequence

Execute these commands in this exact order. If ANY command fails, fix the errors and restart from step 1:

#### Step 1: Type Check

```bash
pnpm typecheck
```

**If errors occur:**

- Fix all TypeScript type errors
- Remove any `any` types
- Ensure proper type imports
- Re-run until clean

#### Step 2: Lint Check

```bash
pnpm lint
```

**If errors occur:**

- Fix all ESLint errors
- Address all warnings
- Ensure import ordering is correct
- Re-run until clean

#### Step 3: Format Check

```bash
pnpm format
```

**This command auto-fixes, then verify:**

- All files are properly formatted
- No formatting inconsistencies remain

#### Step 4: Unit Tests

```bash
pnpm test
```

**If tests fail:**

- Fix failing test logic
- Update test expectations if changes are intentional
- Add missing test coverage for new code
- Re-run until all tests pass

#### Step 5: Build Verification

```bash
pnpm build
```

**If build fails:**

- Fix compilation errors
- Resolve module resolution issues
- Ensure all imports are valid
- Re-run until build succeeds

### Automated Pre-Commit Check Script

Agent should execute this comprehensive check:

```bash
#!/bin/bash
# Pre-commit validation - ALL must pass

echo "🔍 Running pre-commit checks..."

echo "📘 Step 1/5: Type checking..."
pnpm typecheck || { echo "❌ Type check failed. Fix errors and retry."; exit 1; }

echo "🔍 Step 2/5: Linting..."
pnpm lint || { echo "❌ Lint check failed. Fix errors and retry."; exit 1; }

echo "✨ Step 3/5: Formatting..."
pnpm format || { echo "❌ Format check failed. Fix errors and retry."; exit 1; }

echo "🧪 Step 4/5: Unit tests..."
pnpm test || { echo "❌ Tests failed. Fix errors and retry."; exit 1; }

echo "🏗️  Step 5/5: Build verification..."
pnpm build || { echo "❌ Build failed. Fix errors and retry."; exit 1; }

echo "✅ All pre-commit checks passed! Ready to commit."
```

### Agent Workflow for Commits

When Agent is ready to commit, follow this EXACT workflow:

1. **Stage changes**: `git add .`

2. **Run pre-commit checks**: Execute all 5 steps above

3. **If ANY check fails**:
   - Analyze the error output
   - Fix the errors in the codebase
   - Commit the fixes
   - Return to step 2 (re-run ALL checks)

4. **When ALL checks pass**:
   - Commit with proper message: `git commit -m "<type>(<scope>): <description>"`
   - Push to branch: `git push origin <branch-name>`

5. **Verification**: After push, confirm:
   - GitHub Actions pipeline is triggered
   - All CI checks are passing
   - No pipeline failures

### Error Handling Protocol

**When errors are encountered:**

| Error Type    | Agent Action                                                 |
| ------------- | ------------------------------------------------------------ |
| Type errors   | Analyze and fix type definitions, imports, and usage         |
| Lint errors   | Apply auto-fix where possible, manual fix for complex issues |
| Format errors | Re-run `pnpm format` (usually auto-fixes)                    |
| Test failures | Update test logic, fix implementation, or update snapshots   |
| Build errors  | Fix compilation issues, resolve imports, check dependencies  |

**After fixing errors:**

- ✅ Commit the fixes separately if needed
- 🔄 Re-run the COMPLETE pre-commit checklist from step 1
- ⚠️ Never skip steps or assume fixes worked without verification

### Accountability

This workflow ensures:

- ✅ **Zero regressions** reach the main branch
- ✅ **All code is production-ready** before merging
- ✅ **CI/CD pipelines always pass** (no surprises)
- ✅ **"One-and-done"** - customers receive working code, first time

> 🔒 **ENFORCEMENT**: This rule has ZERO EXCEPTIONS. Agent will not commit or push code that fails any of these checks. Period.

---

### Auto-Cleanup Rules

| Trigger                      | Action                                        |
| ---------------------------- | --------------------------------------------- |
| All checklist items complete | Update status to 🟢 Complete                  |
| PR merged to `main`          | Move file from `plans/` to `plans/completed/` |
| 30 days after completion     | Delete from `plans/completed/`                |
| Major release                | Archive or delete all completed plans         |

**Cleanup command** (run periodically):

```bash
# Move completed plans older than 30 days to trash
find plans/completed -name "*.md" -mtime +30 -delete
```

### Example Workflow

1. **Start work**: Create `plans/REMINDER_NOTIFICATIONS_PLAN.md`
2. **During work**: Update checkboxes as each task completes
3. **Complete work**: Status changes to 🟢, create PR
4. **PR merged**: Move to `plans/completed/REMINDER_NOTIFICATIONS_PLAN.md`
5. **30 days later**: Auto-delete or manual cleanup

---

## Required File Checklists by Change Type

Before completing any change, verify that ALL required files have been touched. This prevents incomplete implementations and data drift.

### New Server Action

| File                                 | Action Required                                         |
| ------------------------------------ | ------------------------------------------------------- |
| `app/actions/<entity>.ts`            | Create/update with `'use server'` directive first line  |
| `app/actions/index.ts`               | Export new action module: `export * from "./<entity>";` |
| `types/index.ts`                     | Add/update TypeScript interfaces for the entity         |
| `lib/validations/<entity>.schema.ts` | Add Zod validation schema                               |
| `lib/validations/index.ts`           | Export new schema                                       |

### New Component

| File                                  | Action Required                                 |
| ------------------------------------- | ----------------------------------------------- |
| `components/<ComponentName>.tsx`      | Create with PascalCase filename                 |
| `components/<ComponentName>.test.tsx` | Add unit test (required for complex components) |
| `types/index.ts`                      | Add prop interface if types are shared          |

### New UI Component (Component Library Addition)

> **⚠️ MANDATORY**: Before creating ANY new UI component, complete the [UI Component Audit](#ui-component-audit).

| File                                                  | Action Required                                     |
| ----------------------------------------------------- | --------------------------------------------------- |
| Audit                                                 | Complete UI Component Audit checklist below         |
| `components/ui/<name>.tsx` or `components/<Name>.tsx` | Create component using design tokens                |
| `components/<Name>.stories.tsx`                       | Create Storybook story with Controls                |
| `components/<Name>.test.tsx`                          | Add unit tests with snapshot tests for all variants |
| `lib/feature-flags.ts`                                | Add feature flag for rollout control                |
| `.env.example`                                        | Document new `NEXT_PUBLIC_FEATURE_*` variable       |
| `guidelines/COMPONENT_LIBRARY.md`                     | Add component to appropriate section                |

### Modifying Existing UI Component

| File                              | Action Required                                        |
| --------------------------------- | ------------------------------------------------------ |
| `guidelines/COMPONENT_LIBRARY.md` | Review current documentation                           |
| Component file                    | Make changes using design tokens                       |
| Storybook story                   | Update/add story for new variant                       |
| Test file                         | Add tests for new behavior, update snapshots if needed |

### New Database Table/Column

| File                                      | Action Required                                        |
| ----------------------------------------- | ------------------------------------------------------ |
| `supabase/migrations/YYYYMMDD_<name>.sql` | Create migration file                                  |
| `types/supabase.ts`                       | Regenerate: `pnpm supabase:gen`                        |
| `types/index.ts`                          | Add application-level TypeScript interface (camelCase) |
| `app/actions/<entity>.ts`                 | Add CRUD server actions                                |
| `lib/validations/<entity>.schema.ts`      | Add Zod validation schema                              |

### Migration Execution Policy

> **⚠️ MANDATORY RULE**: All database migrations MUST be run on BOTH dev and prod databases.

**Execution Order:**

1. **Run on DEV first** — Always run migrations on the development database first
2. **If DEV fails, STOP** — Fix the issue and retry on dev before proceeding
3. **Never proceed to PROD with a failing dev migration**
4. **Verify status on both databases** after completion

**Required Steps:**

```bash
# Step 1: Run migration on DEV
./scripts/db.sh link dev
./scripts/db.sh migrate
./scripts/db.sh status  # Verify success

# Step 2: Only if DEV succeeds, run on PROD
./scripts/db.sh link prod
./scripts/db.sh migrate
./scripts/db.sh status  # Verify success

# OR use the combined command:
./scripts/db.sh migrate-both
```

**Failure Handling:**

| Scenario                 | Action                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| DEV migration fails      | STOP. Fix the migration SQL, then retry `./scripts/db.sh migrate-both` |
| DEV succeeds, PROD fails | Investigate PROD-specific issue. May need manual intervention.         |
| Both succeed             | Verify with `./scripts/db.sh status` on both environments              |

---

### New Hook

| File                           | Action Required                               |
| ------------------------------ | --------------------------------------------- |
| `hooks/use<HookName>.tsx`      | Create with `use` prefix + PascalCase         |
| `hooks/use<HookName>.test.tsx` | Add unit test (required for hooks with logic) |
| `types/index.ts`               | Add return type interfaces if complex         |

### New Library Addition

| File                              | Action Required                            |
| --------------------------------- | ------------------------------------------ |
| `package.json`                    | Add dependency (only after approval)       |
| `guidelines/LIBRARY_INVENTORY.md` | Document: name, version, purpose, patterns |
| Relevant source file              | Add usage example                          |

### New Feature (Full)

Combine all applicable checklists above, plus:

| File                      | Action Required                              |
| ------------------------- | -------------------------------------------- |
| `plans/<FEATURE>_PLAN.md` | Create implementation plan with checklist    |
| `e2e/<feature>.spec.ts`   | Add E2E test for critical paths              |
| Component files           | Add `data-testid` attributes for testability |

---

## UI Component Audit

> **MANDATORY**: Complete this audit before creating or modifying ANY UI component.

### Pre-Work Checklist

Before writing any code:

- [ ] **Checked `components/ui/`** — Does a primitive already exist?
- [ ] **Checked Feature Components** in `guidelines/COMPONENT_LIBRARY.md`
- [ ] **Checked Storybook** — Run `pnpm storybook` and browse existing components
- [ ] **Verified no existing component** meets the need (even with modifications)
- [ ] **If modifying**: Reviewed current tests and stories

### Decision Flow

```
Need exists?
├── YES: Existing component with correct behavior → USE IT
├── YES: Existing component needs variant → ADD VARIANT (not new component)
├── YES: Existing component needs refactor → REFACTOR with feature flag
└── NO: No existing component → CREATE NEW (with justification in PR)
```

### New Component Requirements

Every new component MUST have:

1. **Feature Flag** — For controlled rollout (default: `false`)
2. **Design Tokens** — Use `lib/design-tokens.ts`, never hardcode colors
3. **Storybook Story** — See [Storybook Story Requirements](#storybook-story-requirements) below
4. **Unit Tests** — Behavioral tests for all logic
5. **Snapshot Tests** — One per variant/size combination
6. **Documentation** — Added to `guidelines/COMPONENT_LIBRARY.md`

### Storybook Story Requirements

> **⚠️ MANDATORY**: Every component in `components/ui/` or `components/ui/forms/` MUST have a corresponding `.stories.tsx` file.

**Story File Location:**

- Place stories in `components/` alongside dialog/feature components
- Example: `FormInput` → `components/FormInput.stories.tsx`

**Required Stories:**
Every component story file MUST include:

| Story             | Description                                   |
| ----------------- | --------------------------------------------- |
| `Default`         | Basic usage with minimal props                |
| `WithAllFeatures` | All major props enabled                       |
| `SizeVariants`    | If component has size prop (sm/md/lg)         |
| `States`          | Disabled, error, loading states if applicable |
| `Controlled`      | If component supports controlled mode         |
| `FormExample`     | Form integration example for form components  |

**Story Template:**

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ComponentName } from "./ui/component-name";
import { mockFeatureFlags } from "@/lib/feature-flags";

const meta: Meta<typeof ComponentName> = {
  title: "Category/ComponentName",
  component: ComponentName,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => {
      mockFeatureFlags({ FEATURE_FLAG: true });
      return (
        <div className="w-[400px] p-4">
          <Story />
        </div>
      );
    },
  ],
  argTypes: {
    // Define controls for all props
  },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = {
  args: {
    // Minimal props
  },
};
```

**Story Validation Checklist:**

- [ ] Meta includes `tags: ["autodocs"]` for auto-generated docs
- [ ] Feature flag is mocked in decorator
- [ ] `argTypes` defined for all controllable props
- [ ] Renders in `pnpm storybook` without errors
- [ ] Interactive controls work in Storybook

### Variant Addition Requirements

When adding a variant to existing component:

1. **Existing tests pass** — Run `pnpm test:components`
2. **New variant tested** — Add tests for new behavior
3. **Snapshot updated** — Run `pnpm test:update-snapshots` if intentional change
4. **Storybook updated** — Add story or update existing
5. **Documentation updated** — If variant changes usage patterns

---

## Retroactive Compliance Rule

> **⚠️ CRITICAL**: When ANY new rule, standard, or pattern is added to `/guidelines/`, the codebase MUST be brought into compliance BEFORE continuing other work.

### Trigger

This rule applies when:

- New guideline file is created in `/guidelines/`
- Existing guideline is updated with new requirements
- New coding standard or pattern is established
- New component library component is mandated for existing patterns

### Mandatory Workflow

| Step | Action                    | Deliverable                                     |
| ---- | ------------------------- | ----------------------------------------------- |
| 1    | **Create audit plan**     | `plans/<RULE_NAME>_COMPLIANCE_PLAN.md`          |
| 2    | **Full codebase scan**    | List ALL files/locations violating the new rule |
| 3    | **Prioritize violations** | Critical → High → Medium → Low                  |
| 4    | **Remediate violations**  | Fix all with tests, commit incrementally        |
| 5    | **Verify compliance**     | All checks pass, no violations remain           |
| 6    | **Document completion**   | Move plan to `plans/completed/`                 |

### Priority Levels

| Priority     | Definition                                     | Timeline                  |
| ------------ | ---------------------------------------------- | ------------------------- |
| **Critical** | Breaks functionality, security issue           | Fix immediately           |
| **High**     | Affects user experience, inconsistent behavior | Fix before next release   |
| **Medium**   | Code quality, maintainability                  | Fix within current sprint |
| **Low**      | Nice-to-have, cosmetic                         | Fix when touching file    |

### Blocking Rule

**No new feature work may begin until:**

1. All Critical violations are fixed
2. All High violations are fixed OR have approved timeline
3. Audit plan is created and tracked

### Audit Plan Template

Create `plans/<RULE_NAME>_COMPLIANCE_PLAN.md`:

```markdown
# [Rule Name] Compliance Audit

## Rule Summary

Brief description of the new rule/standard.

## Audit Date

YYYY-MM-DD

## Violations Found

### Critical (Must fix immediately)

- [ ] `path/to/file.tsx:L123` - Description of violation

### High (Fix before next release)

- [ ] `path/to/file.tsx:L456` - Description of violation

### Medium (Fix within sprint)

- [ ] `path/to/file.tsx:L789` - Description of violation

### Low (Fix when touching file)

- [ ] `path/to/file.tsx:L012` - Description of violation

## Remediation Progress

- [ ] All critical violations fixed
- [ ] All high violations fixed
- [ ] All medium violations fixed
- [ ] Tests passing
- [ ] Build passing

## Completion Date

YYYY-MM-DD (filled when complete)
```

---

## Coding Standards

### Import Ordering

Imports MUST follow this exact order, with blank lines between groups:

```typescript
// 1. Directive (MUST be first line if present)
"use server";
// OR
"use client";

// 2. React imports
import React, { useState, useEffect, useCallback } from "react";

// 3. External library imports (alphabetical)
import { useDrag } from "react-dnd";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

// 4. Internal absolute imports with @/ prefix (alphabetical by path)
import { createServerClient } from "@/lib/supabase/server";
import { verifyBoardAccess } from "@/utils/authorization.server";
import type { Task, Sprint } from "@/types";
import { useAuth } from "@/app/providers";

// 5. Relative imports (parent directories first, then siblings)
import { Button } from "../ui/button";
import { TaskCard } from "./TaskCard";
import type { LocalType } from "./types";
```

### Naming Conventions

| Type                | Convention               | Example                              |
| ------------------- | ------------------------ | ------------------------------------ |
| Component files     | PascalCase.tsx           | `TaskCard.tsx`                       |
| Server action files | camelCase.ts             | `tasks.ts`, `organizations.ts`       |
| Hook files          | usePascalCase.tsx        | `useAuthorization.tsx`               |
| Test files          | Original.test.tsx        | `TaskCard.test.tsx`                  |
| Schema files        | entity.schema.ts         | `task.schema.ts`                     |
| Migration files     | YYYYMMDD_description.sql | `20240115_add_teams.sql`             |
| Functions           | camelCase                | `getOrganizations`, `handleSubmit`   |
| Types/Interfaces    | PascalCase               | `Task`, `OrganizationMember`         |
| Constants           | SCREAMING_SNAKE_CASE     | `ROLE_HIERARCHY`, `AUTH_STORAGE_KEY` |
| Database columns    | snake_case               | `created_at`, `organization_id`      |
| Frontend props      | camelCase                | `taskId`, `onUpdate`, `isLoading`    |
| Zod schemas         | PascalCaseSchema         | `TaskSchema`, `CreateTaskSchema`     |

### Error Handling Pattern

**Server Actions** - Always return `{ data, error }` or `{ success, error }`:

```typescript
export async function getEntity(
  id: string,
): Promise<{ data: Entity | null; error: string | null }> {
  try {
    // 1. Verify access FIRST
    const access = await verifyEntityAccess(id);
    if (!access.hasAccess) {
      return { data: null, error: access.error || "Access denied" };
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("entities")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching entity:", error);
      return { data: null, error: error.message };
    }

    return { data: transformEntity(data), error: null };
  } catch (err) {
    console.error("Unexpected error:", err);
    return { data: null, error: "An unexpected error occurred" };
  }
}
```

**Components** - Use toast for user feedback:

```typescript
const handleSubmit = async () => {
  try {
    const { data, error } = await createEntity(formData);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Created successfully");
    onSuccess?.(data);
  } catch (err) {
    toast.error("An unexpected error occurred");
  }
};
```

### TypeScript Strictness

- ❌ **NO `any` type** - Use proper typing or `unknown` with type guards
- ✅ **Explicit return types** on all exported functions
- ✅ **Interface over type** for object shapes (unless union type needed)
- ✅ **Use `as const`** for readonly arrays: `["admin", "member"] as const`
- ✅ **Prefer type inference** for local variables when obvious

---

## Architecture Rules

### Server Actions

1. **`'use server'` MUST be the first line** of every server action file
2. **Authorization check MUST come first** before any data access
3. **Transform database snake_case to camelCase** for frontend consumption
4. **Use `revalidatePath()`** after mutations to update cached data
5. **Never expose sensitive data** - filter fields before returning

```typescript
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { verifyBoardAccess } from "@/utils/authorization.server";
import { revalidatePath } from "next/cache";
import type { Task } from "@/types";

interface TaskRow {
  id: string;
  ticket_id: string;
  board_id: string;
  created_at: string;
}

function transformTask(row: TaskRow): Task {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    boardId: row.board_id,
    createdAt: row.created_at,
  };
}

export async function getTasks(
  boardId: string,
): Promise<{ data: Task[] | null; error: string | null }> {
  // 1. Authorization FIRST
  const access = await verifyBoardAccess(boardId);
  if (!access.hasAccess) {
    return { data: null, error: access.error || "Access denied" };
  }

  // 2. Fetch data
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId);

  if (error) {
    return { data: null, error: error.message };
  }

  // 3. Transform and return
  return { data: data.map(transformTask), error: null };
}
```

### Component Patterns

1. **`'use client'` for interactive components** - Any component with state, effects, or event handlers
2. **Hooks at the top** - All hooks must be called before any conditional returns
3. **Destructure props with defaults** - `({ optional = defaultValue }: Props)`
4. **Add `data-testid` for testable elements** - Required for E2E test targets

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui/button";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  readOnly?: boolean;
}

export function TaskCard({ task, onEdit, readOnly = false }: TaskCardProps) {
  // 1. Hooks first
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // 2. Effects
  useEffect(() => {
    // ...
  }, [task.id]);

  // 3. Handlers
  const handleEdit = () => {
    if (!readOnly) {
      setIsEditing(true);
      onEdit?.(task);
    }
  };

  // 4. Render
  return (
    <div data-testid={`task-card-${task.id}`}>
      <h3>{task.title}</h3>
      {!readOnly && (
        <Button data-testid="edit-task-btn" onClick={handleEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}
```

### Authorization Flow

1. **Server-side**: Use `verify*Access()` functions from `@/utils/authorization.server`
2. **Client-side**: Use `useAuthorization()` hook for permission checks
3. **Never trust client-side checks alone** - Always verify on server

```typescript
// Server action
import {
  verifyBoardAccess,
  requireContributorAccess,
} from "@/utils/authorization.server";

export async function createTask(boardId: string, data: CreateTaskData) {
  const boardAccess = await verifyBoardAccess(boardId);
  if (!boardAccess.hasAccess) {
    return { data: null, error: "Access denied" };
  }

  // For write operations, also check role
  if (boardAccess.workspaceId) {
    try {
      await requireContributorAccess(boardAccess.workspaceId);
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  }

  // ... proceed with creation
}
```

```typescript
// Client component
import { useAuthorization } from "@/hooks/useAuthorization";

function TaskActions({ task }: { task: Task }) {
  const { can } = useAuthorization();

  return (
    <>
      {can.editTask() && <Button onClick={handleEdit}>Edit</Button>}
      {can.deleteTask() && <Button onClick={handleDelete}>Delete</Button>}
    </>
  );
}
```

---

## Library Usage Policy

### Rule 1: Use Existing Libraries First

Before suggesting any solution, check [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md). Common solutions already available:

| Need          | Use This                               | NOT This                           |
| ------------- | -------------------------------------- | ---------------------------------- |
| UI Components | `@radix-ui/*` + `components/ui/*`      | Installing new UI library          |
| Icons         | `lucide-react`                         | Other icon libraries               |
| Drag & Drop   | `react-dnd`                            | @dnd-kit, react-beautiful-dnd      |
| Data Fetching | `@tanstack/react-query`                | SWR, custom fetch hooks            |
| Validation    | `zod`                                  | yup, joi, other validators         |
| Date Handling | `date-fns`                             | moment, dayjs                      |
| Styling       | Tailwind CSS + `clsx`/`tailwind-merge` | styled-components, emotion         |
| Forms         | `react-hook-form`                      | formik, other form libraries       |
| Rich Text     | `@tiptap/*`                            | Draft.js, Slate, Quill             |
| Toasts        | `sonner`                               | react-toastify, other toast libs   |
| Animations    | `motion` (framer-motion)               | react-spring, other animation libs |

### Rule 2: Ask Before Adding New Libraries

If a task seems to require a new library:

1. **STOP** - Do not install or add to `package.json`
2. **ASK** - "This would require adding `[library]`. Should I proceed, or would you prefer an alternative approach using existing tools?"
3. **JUSTIFY** - Explain why existing libraries cannot solve the problem
4. **WAIT** - Only proceed after explicit user approval

### Rule 3: Document Approved Libraries

When a new library is approved and added:

1. Add entry to [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md)
2. Include: Package name, version, purpose, usage location, approved patterns
3. Update this document if it replaces an existing recommendation

---

## Testing Requirements

### When Tests Are Required

| Change Type                                 | Unit Test Required | Storybook Story Required | E2E Test Required       |
| ------------------------------------------- | ------------------ | ------------------------ | ----------------------- |
| New UI component (`components/ui/`)         | ✅ Yes             | ✅ **Yes (mandatory)**   | ❌ No                   |
| New form component (`components/ui/forms/`) | ✅ Yes             | ✅ **Yes (mandatory)**   | ❌ No                   |
| New hook with logic                         | ✅ Yes             | ❌ No                    | ❌ No                   |
| Complex feature component                   | ✅ Yes             | ⚠️ Recommended           | ⚠️ If critical path     |
| Server action                               | ⚠️ Recommended     | ❌ No                    | ❌ No                   |
| Utility function                            | ✅ Yes             | ❌ No                    | ❌ No                   |
| New feature                                 | ✅ Yes             | ⚠️ If has UI             | ✅ Yes (critical paths) |
| Bug fix                                     | ✅ Regression test | ❌ No                    | ⚠️ If E2E exists        |

### Test File Conventions

- Place test files alongside source: `Component.tsx` → `Component.test.tsx`
- Use fixtures from `test/fixtures.tsx`
- Mock Supabase using MSW handlers in `lib/test-utils/`

### Required `data-testid` Attributes

Add `data-testid` to elements that E2E tests need to interact with:

```typescript
// Good - specific, predictable IDs
<button data-testid="create-task-btn">Create</button>
<div data-testid={`task-card-${task.id}`}>...</div>
<input data-testid="task-title-input" />

// Bad - generic or missing
<button>Create</button>
<div className="task-card">...</div>
```

---

## PR Workflow

### Using Agent to Fill PR Descriptions

When creating a PR, use Agent to automatically fill out the PR description:

1. Stage your changes: `git add .`
2. Ask Agent: "Fill out the PR description for my staged changes using the PR template"
3. Agent will analyze the diff and populate:
   - Summary of changes
   - Type of change (feature/bugfix/refactor/etc.)
   - Scope from the fixed list
   - Files changed with checklist verification
   - Testing performed
   - Breaking changes assessment

### Pre-PR Checklist

Before creating a PR, Agent must verify:

- [ ] **🚨 MANDATORY PRE-COMMIT CHECKLIST completed** - See section above (ZERO EXCEPTIONS)
  - [ ] ✅ Type check passed (`pnpm typecheck`)
  - [ ] ✅ Lint check passed (`pnpm lint`)
  - [ ] ✅ Format check passed (`pnpm format`)
  - [ ] ✅ Unit tests passed (`pnpm test`)
  - [ ] ✅ Build verification passed (`pnpm build`)
- [ ] All required files for the change type have been touched
- [ ] No `any` types introduced
- [ ] Authorization added for new data access
- [ ] Types updated in `types/index.ts`
- [ ] E2E tests pass for affected flows (`pnpm test:e2e`) if applicable
- [ ] No unapproved new libraries added
- [ ] Import order follows the standard
- [ ] `data-testid` attributes added for testable elements

> ⚠️ **NOTE**: The mandatory pre-commit checklist MUST be completed before even considering a PR. If any pre-commit check fails, the code is not ready for PR.

---

## Quick Reference: Path Aliases

| Alias            | Path             | Example                    |
| ---------------- | ---------------- | -------------------------- |
| `@/*`            | Root             | `@/utils/authorization`    |
| `@/components/*` | `./components/*` | `@/components/ui/button`   |
| `@/lib/*`        | `./lib/*`        | `@/lib/supabase/server`    |
| `@/hooks/*`      | `./hooks/*`      | `@/hooks/useAuthorization` |
| `@/types/*`      | `./types/*`      | `@/types/index`            |
| `@test/*`        | `./test/*`       | `@test/fixtures`           |
| `@app/types`     | `./types/index`  | `@app/types`               |

---

## Related Documents

- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Canonical file locations
- [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md) - Approved dependencies
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing patterns
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Git workflow
