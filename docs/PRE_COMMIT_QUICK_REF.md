# 🚨 Pre-Commit Quick Reference

> **ONE RULE**: All checks must pass before commit. NO EXCEPTIONS.

---

## ⚡ Quick Commands

```bash
# Run all checks at once
pnpm pre-commit

# Or run individually
pnpm typecheck && pnpm lint && pnpm format && pnpm test && pnpm build
```

---

## ✅ The 5 Mandatory Checks

| #   | Check          | Command          | Purpose                   |
| --- | -------------- | ---------------- | ------------------------- |
| 1️⃣  | **Type Check** | `pnpm typecheck` | Validate TypeScript types |
| 2️⃣  | **Lint**       | `pnpm lint`      | Enforce code quality      |
| 3️⃣  | **Format**     | `pnpm format`    | Ensure consistent style   |
| 4️⃣  | **Test**       | `pnpm test`      | Verify functionality      |
| 5️⃣  | **Build**      | `pnpm build`     | Confirm compilation       |

---

## 🔄 The Workflow

```
Make Changes
    ↓
Stage Files (git add .)
    ↓
Run Pre-Commit Checks
    ↓
    ↙️      ↘️
  PASS     FAIL
   ↓         ↓
Commit   Fix Errors
   ↓         ↓
 Push    Re-run Checks
           ↓
        (repeat)
```

---

## ❌ If Checks Fail

1. **Read the error output**
2. **Fix the errors in code**
3. **Commit the fixes** (if substantial)
4. **Re-run ALL checks from step 1**
5. **Never skip or bypass**

---

## 🎯 Common Fixes

| Error Type    | Quick Fix                          |
| ------------- | ---------------------------------- |
| Type errors   | Add proper types, remove `any`     |
| Lint errors   | Run `pnpm lint --fix`              |
| Format errors | Run `pnpm format` (auto-fixes)     |
| Test failures | Update tests or fix implementation |
| Build errors  | Check imports and dependencies     |

---

## 🚀 Agent Commit Process

```bash
# 1. Stage changes
git add .

# 2. Run checks
pnpm pre-commit

# 3. If all pass, commit
git commit -m "type(scope): description"

# 4. Push
git push origin <branch-name>

# 5. Verify CI pipeline
# Check GitHub Actions
```

---

## 📋 Pre-Commit Checklist

Before EVERY commit:

- [ ] ✅ Type check passed
- [ ] ✅ Lint check passed
- [ ] ✅ Format check passed
- [ ] ✅ Unit tests passed
- [ ] ✅ Build verification passed

---

## 🔒 Zero Exceptions Policy

**This rule has NO exceptions:**

- ❌ Can't skip for "quick fixes"
- ❌ Can't bypass for "urgent changes"
- ❌ Can't defer for "cleanup later"
- ✅ MUST pass all checks, every time

---

## 💡 Pro Tips

### Use the Script

```bash
./scripts/pre-commit-checks.sh
```

Beautiful colored output with progress tracking.

### Add Alias

```bash
# Add to ~/.bashrc or ~/.zshrc
alias pre="pnpm pre-commit"
```

### Watch Mode (Development)

```bash
# Auto-run tests while developing
pnpm test -- --watch
```

---

## 📚 Full Documentation

- [Pre-Commit Workflow](./PRE_COMMIT_WORKFLOW.md)
- [Quality Commitment](./QUALITY_COMMITMENT.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Agent Instructions](../templates/AGENT_EDITING_INSTRUCTIONS.md)

---

## ⚠️ Remember

> **"One-and-Done" Service Commitment**
>
> Every commit is production-ready.
> Every pipeline passes.
> Every time.

---

🔒 **No exceptions. Ever.**
