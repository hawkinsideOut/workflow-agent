# Agent Editing Instructions

> **Purpose**: This document provides **mandatory rules** for AI coding agents when editing this codebase. These rules ensure consistency, prevent regressions, and maintain code quality.

---

## Core Rules

### 1. Read Before Writing

**NEVER edit a file without first understanding its context.**

Before modifying any file:

- [ ] Read the file completely
- [ ] Identify related files (imports, tests, types)
- [ ] Check for documentation (README, JSDoc, comments)
- [ ] Understand the surrounding architecture

### 2. Create Implementation Plans

**For any change beyond trivial edits, create a plan FIRST.**

```markdown
## Implementation Plan

### Goal

[What are we trying to accomplish?]

### Files to Modify

1. `path/to/file.ts` - [What changes and why]
2. `path/to/test.ts` - [Test updates needed]

### Steps

1. [First step]
2. [Second step]
3. [Verification step]

### Risks

- [Potential issue 1] - [Mitigation]
```

### 3. Follow Existing Patterns

**When in doubt, follow what the codebase already does.**

Look for patterns in:

- Similar files in the same directory
- Files with the same purpose
- Established project conventions

```typescript
// ❌ WRONG - Inventing new patterns
function fetchData() {
  return axios.get("/api/data");
}

// ✅ CORRECT - Follow existing patterns
// If the codebase uses a specific client pattern:
function fetchData() {
  return apiClient.get("/data");
}
```

### 4. Maintain Backwards Compatibility

**Never break existing functionality without explicit permission.**

- Keep existing exports working
- Add new parameters as optional
- Use deprecation instead of removal
- Update all call sites when signatures change

---

## File Checklist by Change Type

### Adding a New File

- [ ] Follow naming conventions (see project style guide)
- [ ] Add proper file header/documentation
- [ ] Export from appropriate index file
- [ ] Add to any relevant documentation
- [ ] Create corresponding test file
- [ ] Update SINGLE_SOURCE_OF_TRUTH.md if it's a canonical location

### Modifying an Existing File

- [ ] Read entire file first
- [ ] Maintain existing style and patterns
- [ ] Update related tests
- [ ] Update JSDoc/comments if behavior changes
- [ ] Check for breaking changes to exports

### Deleting a File

- [ ] Confirm no imports reference this file
- [ ] Remove from index exports
- [ ] Update documentation references
- [ ] Remove associated test file
- [ ] Get explicit approval

### Adding a New Dependency

- [ ] Check LIBRARY_INVENTORY.md for existing alternatives
- [ ] Verify license compatibility
- [ ] Assess bundle size impact
- [ ] Document in LIBRARY_INVENTORY.md
- [ ] Use established import patterns

---

## Coding Standards

### Naming Conventions

| Type | Convention | Example |
| ---- | ---------- | ------- |
| Files (components) | kebab-case | `user-profile.ts` |
| Files (utilities) | kebab-case | `format-date.ts` |
| Functions | camelCase | `getUserById()` |
| Classes | PascalCase | `UserService` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Enums | PascalCase | `Status.Active` |

### Import Order

```typescript
// 1. External libraries (node_modules)
import { z } from "zod";
import { describe, expect, test } from "vitest";

// 2. Internal aliases (@/ paths)
import { UserService } from "@/lib/services/user";
import { formatDate } from "@/lib/utils/date";

// 3. Relative imports (./  ../)
import { helper } from "./helper";
import type { LocalType } from "../types";

// 4. Type-only imports (last)
import type { Config } from "@/types";
```

### Error Handling

**Always handle errors explicitly. Never swallow errors silently.**

```typescript
// ❌ WRONG - Silent failure
try {
  await riskyOperation();
} catch {
  // do nothing
}

// ✅ CORRECT - Handle and report
try {
  await riskyOperation();
} catch (error) {
  logger.error("Operation failed", { error });
  throw new AppError("OPERATION_FAILED", { cause: error });
}
```

### Comments

```typescript
// ✅ GOOD - Explains WHY, not what
// We cache this result because the API has aggressive rate limiting
const cachedResult = await getCachedOrFetch(key);

// ❌ BAD - Explains what (obvious from code)
// Get the user from the database
const user = await db.users.findById(id);
```

---

## Testing Requirements

### When Tests Are Required

| Change Type | Unit Test | Integration Test |
| ----------- | --------- | ---------------- |
| New function/method | ✅ Required | If has side effects |
| Bug fix | ✅ Required (prove fix) | If integration issue |
| New component/module | ✅ Required | If has dependencies |
| Refactor | Update existing | Update if affected |
| Config change | Optional | If affects behavior |

### Test File Location

Tests should be co-located with the code they test:

```
src/
├── services/
│   ├── user/
│   │   ├── user-service.ts
│   │   └── user-service.test.ts  ← Co-located test
```

### Test Naming

```typescript
describe("UserService", () => {
  describe("getUserById", () => {
    test("returns user when found", async () => {
      /* ... */
    });
    test("throws NotFoundError when user does not exist", async () => {
      /* ... */
    });
    test("handles database connection errors", async () => {
      /* ... */
    });
  });
});
```

---

## Git Commit Standards

### Commit Message Format

```
type(scope): short description

- Detail 1
- Detail 2

Refs: #issue-number
```

### Types

| Type | Description |
| ---- | ----------- |
| feat | New feature |
| fix | Bug fix |
| docs | Documentation only |
| refactor | Code change (no feature/fix) |
| test | Adding/updating tests |
| chore | Build, tooling, deps |

### Examples

```
feat(auth): add password reset flow

- Add forgot password endpoint
- Create reset email template
- Add reset token validation

Refs: #123

---

fix(api): handle null user gracefully

- Add null check before accessing user.email
- Return proper 404 response

Refs: #456
```

---

## Prohibited Actions

**NEVER do these without explicit approval:**

- [ ] Delete files
- [ ] Change public API signatures
- [ ] Add new dependencies
- [ ] Modify security-related code
- [ ] Change database schemas
- [ ] Alter authentication/authorization logic
- [ ] Modify CI/CD configuration
- [ ] Remove or bypass tests

---

## When Stuck

1. **Gather more context** - Read related files
2. **Check documentation** - README, JSDoc, comments
3. **Search codebase** - Look for similar patterns
4. **Ask for clarification** - Better to ask than assume
5. **Start small** - Make minimal changes first

---

## Pre-Submission Checklist

Before considering any change complete:

- [ ] All tests pass
- [ ] No linting errors
- [ ] Type checking passes
- [ ] Follows existing patterns
- [ ] Documentation updated (if needed)
- [ ] No console.log/debug statements
- [ ] No hardcoded values (use constants/config)
- [ ] Error handling is appropriate
- [ ] Backwards compatible (or approved breaking change)

---

## Related Documents

- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Canonical locations
- [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md) - Approved libraries
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing requirements
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Git workflow
