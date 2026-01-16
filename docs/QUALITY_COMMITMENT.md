# Quality Commitment: "One-and-Done" Service

> **Status**: 🔒 Active Policy  
> **Effective Date**: January 15, 2026  
> **Scope**: All workflow-agent code, contributions, and AI agent operations

---

## Our Commitment

At workflow-agent, we are committed to making our system **as autonomous as possible** while ensuring **accuracy and efficiency** for our customers. When a GitHub Actions pipeline is established, we take full responsibility for code quality.

### "One-and-Done" Service Guarantee

We deliver working code the first time, every time. No surprises. No broken pipelines. No rework needed.

---

## Core Principles

### 1. Autonomy with Accountability

- AI agents operate autonomously within strict quality guidelines
- All code must pass comprehensive validation before commit
- Zero human intervention required for quality checks

### 2. Mandatory Quality Gates

Every single commit must pass:

- ✅ **Type checking** - All TypeScript types validated
- ✅ **Linting** - Code quality standards enforced
- ✅ **Formatting** - Consistent code style maintained
- ✅ **Unit testing** - All tests passing
- ✅ **Build verification** - Code compiles successfully

### 3. Zero Exceptions Policy

🔒 **There are NO exceptions to pre-commit checks.**

- If a check fails, Agent fixes it
- Agent re-runs all checks until they pass
- Only then may Agent commit and push
- This rule applies to ALL contributors (human and AI)

---

## Implementation

### For AI Agents

AI agents working on workflow-agent MUST:

1. **Follow the mandatory pre-commit workflow** (see [PRE_COMMIT_WORKFLOW.md](./PRE_COMMIT_WORKFLOW.md))
2. **Execute all 5 quality checks** before every commit
3. **Fix all errors automatically** without skipping steps
4. **Re-run checks** until all pass
5. **Verify CI pipeline** passes after push

### For Human Contributors

Human contributors must:

1. **Read** [CONTRIBUTING.md](../CONTRIBUTING.md)
2. **Run** the pre-commit checks: `pnpm pre-commit` or `./scripts/pre-commit-checks.sh`
3. **Fix** any errors before committing
4. **Verify** all checks pass before creating a PR

---

## Quality Checklist

### Pre-Commit (MANDATORY - ZERO EXCEPTIONS)

```bash
# Automated script
pnpm pre-commit

# Or manually
pnpm typecheck  # ✅ Must pass
pnpm lint       # ✅ Must pass
pnpm format     # ✅ Must pass
pnpm test       # ✅ Must pass
pnpm build      # ✅ Must pass
```

### Pre-Push Verification

- [ ] All pre-commit checks passed
- [ ] Commits follow conventional commit format
- [ ] Branch follows naming convention
- [ ] Feature branch is up to date with main

### Pre-PR Requirements

- [ ] All pre-commit checks passed (verified)
- [ ] PR description filled out completely
- [ ] All files for change type have been touched
- [ ] No unapproved dependencies added
- [ ] Documentation updated if needed

---

## Benefits to Customers

By enforcing this policy, we ensure:

### ✅ Reliability

- GitHub Actions pipelines always pass
- No broken builds reach main branch
- Predictable deployment process

### ✅ Quality

- All code is production-ready
- Comprehensive test coverage
- Type-safe implementations

### ✅ Efficiency

- No wasted CI/CD cycles
- No rework due to quality issues
- Fast, confident merges

### ✅ Trust

- Customers receive working code first time
- "One-and-done" service commitment
- Professional, autonomous operation

---

## Enforcement Mechanisms

### Automated

1. **Pre-commit script** - `./scripts/pre-commit-checks.sh`
2. **npm scripts** - `pnpm pre-commit` and `pnpm verify`
3. **GitHub Actions** - CI pipeline runs same checks
4. **Agent instructions** - Built into AGENT_EDITING_INSTRUCTIONS.md

### Manual

1. **Code review** - Reviewers verify checks were run
2. **PR templates** - Include pre-commit checklist
3. **Documentation** - Clear guidelines in all docs

---

## Accountability

### For AI Agents

- Must complete ALL checks before commit
- Must fix ALL errors encountered
- Must verify CI pipeline success
- Must document any blockers

### For Maintainers

- Enforce policy in code reviews
- Reject PRs without passing checks
- Update documentation as needed
- Improve tooling to make compliance easier

### For Contributors

- Follow all guidelines
- Run checks before submitting PR
- Fix any issues promptly
- Ask questions if unclear

---

## Continuous Improvement

This policy itself is subject to improvement:

### Feedback Welcome

- Suggest improvements via `workflow-agent suggest`
- Open issues for policy questions
- Propose tooling enhancements
- Share best practices

### Evolution

As we learn and improve:

- Documentation will be updated
- Tooling will be enhanced
- Process will be refined
- Standards will be raised

---

## Related Documentation

- 📋 [Pre-Commit Workflow](./PRE_COMMIT_WORKFLOW.md) - Detailed workflow guide
- 🤝 [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines
- 🤖 [Agent Editing Instructions](../templates/AGENT_EDITING_INSTRUCTIONS.md) - Complete agent rules
- 🌿 [Branching Strategy](../templates/BRANCHING_STRATEGY.md) - Git workflow
- 🧪 [Testing Strategy](../templates/TESTING_STRATEGY.md) - Testing requirements

---

## Summary

### The Rule

**Before every commit: typecheck → lint → format → test → build**

### The Promise

**Every commit is production-ready. Every pipeline passes. Every time.**

### The Result

**Autonomous, reliable, quality code delivery. "One-and-done."**

---

🔒 **This is not negotiable. This is our commitment to excellence.**
