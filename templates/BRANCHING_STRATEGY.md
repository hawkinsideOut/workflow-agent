# Branching Strategy

> **Purpose**: This document defines the Git branching model and PR workflow for {{projectName}}. All contributors must follow these conventions.

---

## Branch Types

| Branch Pattern      | Purpose                       | Base Branch        | Merge Target       |
| ------------------- | ----------------------------- | ------------------ | ------------------ |
| `main`              | Production-ready code         | -                  | -                  |
| `develop`           | Integration branch (optional) | `main`             | `main`             |
| `feat/<name>`       | New features                  | `main` / `develop` | `main` / `develop` |
| `fix/<name>`        | Bug fixes                     | `main`             | `main`             |
| `hotfix/<name>`     | Urgent production fixes       | `main`             | `main`             |
| `docs/<name>`       | Documentation only            | `main`             | `main`             |
| `refactor/<name>`   | Code improvements             | `main`             | `main`             |
| `test/<name>`       | Test additions/fixes          | `main`             | `main`             |
| `chore/<name>`      | Tooling, deps, config         | `main`             | `main`             |
| `release/<version>` | Release preparation           | `develop`          | `main`             |

---

## Branch Naming Convention

### Format

```
<type>/<issue-number?>-<short-description>
```

### Rules

- Use lowercase
- Use hyphens (not underscores)
- Keep descriptions concise (2-4 words)
- Include issue number when applicable

### Examples

```bash
# Good ✅
feat/123-user-authentication
fix/456-login-timeout
docs/update-api-reference
refactor/improve-error-handling
hotfix/security-patch

# Bad ❌
Feature/UserAuth           # Wrong case, wrong format
fix_login_timeout          # Underscores not allowed
feat/implement-the-new-user-authentication-system  # Too long
```

---

## Workflow Models

### Simple Model (No Develop Branch)

Best for: Smaller projects, solo developers, simple release cycles

```
main ──────●───────●───────●───────●──────
           ↑       ↑       ↑       ↑
     feat/a   fix/b  feat/c  feat/d

All branches → main (via PR)
```

### GitFlow Model (With Develop Branch)

Best for: Larger teams, scheduled releases, multiple environments

```
main    ──────────────●─────────────────●────
                      ↑                 ↑
                  release/1.0       release/2.0
                      ↑                 ↑
develop ────●────●────●────●────●───────●────
            ↑    ↑         ↑    ↑
      feat/a  feat/b   feat/c  fix/d
```

---

## Creating a Branch

```bash
# Start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/123-add-user-profile

# Or for GitFlow, start from develop
git checkout develop
git pull origin develop
git checkout -b feat/123-add-user-profile
```

---

## Pull Request Workflow

### 1. Before Creating PR

- [ ] Branch is up to date with base branch
- [ ] All tests pass locally
- [ ] Linting passes
- [ ] Self-review completed
- [ ] Commits are clean and meaningful

```bash
# Update with latest changes
git fetch origin
git rebase origin/main  # or origin/develop

# Run checks
npm test
npm run lint
npm run typecheck
```

### 2. PR Title Format

```
<type>(scope): <description>
```

**Examples:**

```
feat(auth): add password reset flow
fix(api): handle null response correctly
docs(readme): update installation steps
refactor(utils): simplify date formatting
```

### 3. PR Description Template

```markdown
## Summary

Brief description of what this PR does.

## Changes

- Change 1
- Change 2
- Change 3

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests (if applicable)
- [ ] Manual testing performed

## Screenshots (if applicable)

## Related Issues

Closes #123
```

### 4. Review Requirements

| Change Type     | Required Approvals | Additional        |
| --------------- | ------------------ | ----------------- |
| Feature         | 1+                 | -                 |
| Bug fix         | 1+                 | -                 |
| Hotfix          | 1+                 | Expedited review  |
| Breaking change | 2+                 | Team notification |
| Security        | 2+                 | Security team     |
| Docs only       | 1                  | Can self-merge    |

### 5. Merge Strategy

| Scenario       | Strategy       | Result           |
| -------------- | -------------- | ---------------- |
| Feature branch | Squash & Merge | Clean history    |
| Release branch | Merge commit   | Preserve history |
| Hotfix         | Merge commit   | Traceable        |

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Description                  |
| ---------- | ---------------------------- |
| `feat`     | New feature                  |
| `fix`      | Bug fix                      |
| `docs`     | Documentation                |
| `refactor` | Code change (no feature/fix) |
| `test`     | Test changes                 |
| `chore`    | Build, deps, tooling         |
| `style`    | Formatting (no code change)  |
| `perf`     | Performance improvement      |

### Good Commit Messages

```bash
# ✅ Good
feat(auth): add JWT token refresh mechanism

Implements automatic token refresh when access token expires.
Adds refresh token rotation for security.

Closes #234

# ✅ Good
fix(api): handle empty response array

Previously threw undefined error when API returned empty array.
Now returns empty result set gracefully.

# ❌ Bad
fixed stuff

# ❌ Bad
WIP

# ❌ Bad
feat: changes
```

### Atomic Commits

Each commit should be:

- **Self-contained**: Works on its own
- **Focused**: One logical change
- **Tested**: Doesn't break the build

```bash
# ✅ Good - atomic commits
feat(user): add user model and schema
feat(user): add user service layer
feat(user): add user API endpoints
test(user): add user service tests

# ❌ Bad - mixed concerns
added user stuff and fixed bug and updated docs
```

---

## Branch Protection

### Main Branch Rules

- [ ] Require pull request before merging
- [ ] Require at least 1 approval
- [ ] Require status checks to pass
- [ ] Require branches to be up to date
- [ ] No direct pushes

### Status Checks Required

<!-- PROJECT-SPECIFIC: List your required CI checks -->

- [ ] Build passes
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Code coverage threshold met

---

## Handling Conflicts

```bash
# Update your branch with latest main
git fetch origin
git rebase origin/main

# If conflicts occur:
# 1. Resolve conflicts in each file
# 2. Stage resolved files
git add <resolved-files>

# 3. Continue rebase
git rebase --continue

# 4. Force push (only on feature branches!)
git push --force-with-lease
```

---

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1  (patch: bug fix)
1.0.1 → 1.1.0  (minor: new feature)
1.1.0 → 2.0.0  (major: breaking change)
```

### Release Branch Workflow

```bash
# Create release branch
git checkout develop  # or main
git checkout -b release/1.2.0

# Update version
npm version 1.2.0 --no-git-tag-version

# Commit version bump
git add .
git commit -m "chore(release): bump version to 1.2.0"

# After testing, merge to main
git checkout main
git merge release/1.2.0

# Tag the release
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin main --tags
```

---

## Quick Reference

```bash
# Create feature branch
git checkout main && git pull
git checkout -b feat/description

# Keep branch updated
git fetch origin && git rebase origin/main

# Squash commits before PR (optional)
git rebase -i HEAD~3  # squash last 3 commits

# Force push after rebase (only feature branches!)
git push --force-with-lease

# Delete merged branch
git branch -d feat/description
git push origin --delete feat/description
```

---

## Related Documents

- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Coding rules
- [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) - Deployment workflow
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing requirements
