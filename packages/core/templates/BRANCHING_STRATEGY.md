# Branching Strategy

> **Purpose**: This document defines the Git branching strategy, naming conventions, PR requirements, and merge policies. Following these guidelines ensures a clean commit history and reliable releases.

---

## Table of Contents

1. [Branch Types](#branch-types)
2. [Branch Naming Conventions](#branch-naming-conventions)
3. [PR Title Format](#pr-title-format)
4. [Allowed Scopes](#allowed-scopes)
5. [Merge Requirements](#merge-requirements)
6. [Workflow](#workflow)

---

## Branch Types

| Branch Type  | Purpose                                    | Base Branch      | Merges To       |
| ------------ | ------------------------------------------ | ---------------- | --------------- |
| `main`       | Production-ready code                      | -                | -               |
| `release/*`  | Release candidates (e.g., `release/1.2.0`) | Feature branches | `main`          |
| `feature/*`  | New features                               | `main`           | `release/*`     |
| `bugfix/*`   | Non-urgent bug fixes                       | `main`           | `release/*`     |
| `hotfix/*`   | Urgent production fixes                    | `main`           | `main` (direct) |
| `chore/*`    | Maintenance tasks (deps, config)           | `main`           | `release/*`     |
| `refactor/*` | Code refactoring (no new features)         | `main`           | `release/*`     |
| `docs/*`     | Documentation only                         | `main`           | `release/*`     |
| `test/*`     | Test additions/improvements                | `main`           | `release/*`     |

> **Important**: Only `release/*` and `hotfix/*` branches can merge directly to `main`. All other branch types must go through a release branch. See [Release Workflow](#release-workflow) for details.

---

## Branch Naming Conventions

### Format

```
<type>/<scope>/<short-description>
```

### Rules

1. **Type**: Must be one of `feature`, `bugfix`, `hotfix`, `chore`, `refactor`, `docs`, `test`
2. **Scope**: Must be from the [allowed scopes list](#allowed-scopes)
3. **Description**: Lowercase, hyphen-separated, 2-5 words

### Examples

```bash
# Good branch names
feature/tasks/add-due-date-reminder
bugfix/auth/fix-session-expiry
hotfix/notifications/missing-toast-message
chore/deps/upgrade-next-to-16
refactor/boards/simplify-column-logic
docs/test/update-testing-guide
test/comments/add-mention-tests

# Bad branch names
feature/add-new-feature          # Missing scope
FEATURE/tasks/add-reminder       # Uppercase type
feature/tasks/AddDueDateReminder # CamelCase description
fix/authentication-bug           # Wrong type (use bugfix)
```

---

## PR Title Format

PR titles MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) format.

### Format

```
<type>(<scope>): <description>
```

### Rules

1. **Type**: One of: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`, `build`, `ci`
2. **Scope**: Must be from the [allowed scopes list](#allowed-scopes)
3. **Description**: Lowercase, imperative mood, no period at end

### Type Mapping (Branch → PR Title)

| Branch Type  | PR Title Type |
| ------------ | ------------- |
| `feature/*`  | `feat`        |
| `bugfix/*`   | `fix`         |
| `hotfix/*`   | `fix`         |
| `chore/*`    | `chore`       |
| `refactor/*` | `refactor`    |
| `docs/*`     | `docs`        |
| `test/*`     | `test`        |

### Examples

```
# Good PR titles
feat(tasks): add due date reminder notifications
fix(auth): resolve session expiry on page refresh
refactor(boards): simplify column drag-drop logic
chore(deps): upgrade Next.js to v16.2
docs(test): update unit testing examples
test(comments): add tests for @mention functionality

# Bad PR titles
Added due date reminders                    # Missing type and scope
feat: add task reminders                    # Missing scope
feat(tasks): Add Due Date Reminders         # Capitalized description
feat(tasks): add due date reminders.        # Period at end
feature(tasks): add due date reminders      # Wrong type (use feat)
```

---

## Allowed Scopes

These are the only valid scopes for branch names and PR titles:

| Scope           | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| `auth`          | Authentication, authorization, sessions, roles, permissions |
| `tasks`         | Task CRUD, task details, assignments, task types            |
| `boards`        | Kanban boards, columns, board views, drag-drop              |
| `sprints`       | Sprint management, sprint planning, sprint completion       |
| `epics`         | Epic management, epic hierarchy, epic linking               |
| `comments`      | Comments, @mentions, activity feed                          |
| `notifications` | Notification system, real-time updates, toasts              |
| `settings`      | User preferences, org settings, configuration               |
| `admin`         | Super admin, org admin features, user management            |
| `ui`            | General UI components, styling, themes, responsive design   |
| `api`           | Server actions, API patterns, data fetching                 |
| `db`            | Database migrations, schema changes, RLS policies           |
| `deps`          | Dependency updates, package management                      |
| `docs`          | Documentation changes                                       |
| `test`          | Test additions, test fixes, test infrastructure             |
| `perf`          | Performance improvements                                    |
| `infra`         | Build configuration, CI/CD, deployment config               |

### Adding New Scopes

If you need a new scope:

1. Discuss with the team
2. Add to this document
3. Update any linting rules (if applicable)

---

## Merge Requirements

### Required for All PRs

- [ ] **PR title follows conventional commits format**
- [ ] **PR description filled out** (use Agent to auto-generate)
- [ ] **Unit tests pass** (`pnpm test`)
- [ ] **TypeScript compiles** (`pnpm typecheck`)
- [ ] **Linting passes** (`pnpm lint`)
- [ ] **No `any` types** introduced without justification
- [ ] **No unapproved libraries** added

### Additional Requirements by Change Type

| Change Type | Additional Requirements                                      |
| ----------- | ------------------------------------------------------------ |
| `feat`      | E2E tests for critical paths, `data-testid` attributes added |
| `fix`       | Regression test added to prevent recurrence                  |
| `refactor`  | All existing tests still pass                                |
| `db`        | Migration tested locally, rollback SQL documented            |

### Review Requirements

| Change Size                | Review Requirement             |
| -------------------------- | ------------------------------ |
| Small (1-50 lines)         | Self-review + automated checks |
| Medium (51-200 lines)      | One reviewer                   |
| Large (201+ lines)         | Two reviewers                  |
| Critical (auth, db, admin) | Two reviewers + maintainer     |

---

## Workflow

### Branch Protection Rules

This repository uses GitHub Repository Rulesets to enforce the following:

- ✅ Only `release/*` and `hotfix/*` branches can merge to `main`
- ✅ Required status checks: `Build`, `Lint`, `Prettier`, `TypeCheck`
- ✅ Pull request required before merging
- ✅ Force pushes blocked on `main`

See [RULESET_SETUP.md](../.github/RULESET_SETUP.md) for configuration instructions.

---

### Release Workflow

The standard workflow for getting changes into production:

```
feature/tasks/new-feature ──┐
feature/auth/login-update ──┼──► release/1.2.0 ──► main ──► Production
bugfix/ui/fix-button ───────┘
```

#### 1. Create Feature Branch

```bash
# Start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/tasks/add-due-date-reminder
```

#### 2. Develop and Test

- Make changes following [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md)
- Add tests for new functionality
- Ensure all checks pass locally: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`

#### 3. Create Release Branch

When ready to release (can bundle multiple features):

```bash
# Create release branch from main
git checkout main
git pull origin main
git checkout -b release/1.2.0

# Merge feature branches into release
git merge feature/tasks/add-due-date-reminder
git merge feature/auth/login-update
# ... merge other features as needed
```

#### 4. Open PR to Main

```bash
git push origin release/1.2.0
```

Then create PR on GitHub:

- **From**: `release/1.2.0`
- **To**: `main`
- **Title**: `release: v1.2.0`
- CI will run and validate all changes

#### 5. Review and Merge

- Get required approvals
- Ensure all CI checks pass
- **Squash and merge** to `main`
- Deployment triggers automatically via Vercel

#### 6. Clean Up

```bash
git checkout main
git pull origin main
git branch -d release/1.2.0
git push origin --delete release/1.2.0
```

---

### Feature Branch Workflow

For individual feature development:

### 1. Create Branch

```bash
# Start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/tasks/add-due-date-reminder
```

### 2. Make Changes

Follow the patterns in [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md):

- Touch all required files for your change type
- Add tests for new functionality
- Add `data-testid` for testable elements

### 3. Commit Changes

Use conventional commit messages for individual commits:

```bash
git add .
git commit -m "feat(tasks): add DueDateReminder component"
git commit -m "feat(tasks): add reminder notification logic"
git commit -m "test(tasks): add due date reminder tests"
```

### 4. Push and Create PR

```bash
git push origin feature/tasks/add-due-date-reminder
```

Then create PR on GitHub with:

- Title: `feat(tasks): add due date reminder notifications`
- Description: Use the PR template, have Agent fill it out

### 5. Address Review Feedback

```bash
# Make changes based on feedback
git add .
git commit -m "fix(tasks): address review feedback on reminder logic"
git push
```

### 6. Merge

Once approved:

- **Squash and merge** for feature/bugfix branches (cleaner history)
- **Merge commit** for hotfixes (preserve full context)

### 7. Clean Up

```bash
# After merge, delete local branch
git checkout main
git pull origin main
git branch -d feature/tasks/add-due-date-reminder
```

---

## Hotfix Workflow

For urgent production issues that cannot wait for a release cycle:

```
hotfix/auth/critical-fix ─────────────────────► main ──► Production
```

> **Note**: Hotfixes bypass the release branch and merge directly to `main`. Use sparingly.

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/auth/fix-login-crash

# 2. Make minimal fix
# ... fix the issue ...

# 3. Commit with urgency context
git add .
git commit -m "fix(auth): resolve crash on login with expired token"

# 4. Push and create PR to main
git push origin hotfix/auth/fix-login-crash

# 5. Request expedited review
# Tag reviewers, mark as urgent in PR description

# 6. Merge with merge commit (not squash)
# This preserves the hotfix commit for easy tracking

# 7. Monitor deployment
# Watch Vercel deployment and production logs
```

---

## Release Notes

When features are released, the conventional commit format enables automatic changelog generation:

```markdown
## [1.2.0] - 2026-01-08

### Features

- **tasks**: add due date reminder notifications (#123)
- **boards**: enable column reordering (#124)

### Bug Fixes

- **auth**: resolve session expiry on page refresh (#125)
- **notifications**: fix missing toast on task delete (#126)

### Refactoring

- **boards**: simplify column drag-drop logic (#127)
```

---

## Quick Reference

### Branch Creation

```bash
git checkout -b <type>/<scope>/<description>
```

### PR Title

```
<type>(<scope>): <description>
```

### Types

| Type       | Use For                       |
| ---------- | ----------------------------- |
| `feat`     | New features                  |
| `fix`      | Bug fixes                     |
| `refactor` | Code refactoring              |
| `chore`    | Maintenance                   |
| `docs`     | Documentation                 |
| `test`     | Tests                         |
| `perf`     | Performance                   |
| `style`    | Code style (no logic changes) |

---

## Related Documents

- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Editing rules
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing requirements
- [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) - PR template
