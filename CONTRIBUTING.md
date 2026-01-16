# Contributing to Workflow Agent

Thank you for your interest in contributing to Workflow Agent! This document provides guidelines for contributing to the project.

## 🎯 Ways to Contribute

1. **Report Bugs** - Found a bug? [Open an issue](https://github.com/hawkinsideOut/workflow-agent/issues/new?template=bug_report.md)
2. **Suggest Improvements** - Use `workflow suggest "<your-idea>"` or [open a discussion](https://github.com/hawkinsideOut/workflow-agent/discussions)
3. **Submit Pull Requests** - Fix bugs, add features, improve documentation
4. **Create Presets** - Share scope presets for new project types
5. **Translate** - Help translate to new languages
6. **Write Documentation** - Improve guides, add examples

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/hawkinsideOut/workflow-agent.git
cd workflow-agent

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Test the CLI
./packages/core/dist/cli/index.js --help
```

## 📋 Pull Request Process

### Before You Start

1. **Check existing issues** - Someone might already be working on it
2. **Open an issue first** - Discuss your idea before implementing
3. **Follow the workflow** - Workflow Agent dogfoods itself!

### Branch Naming

Follow the format: `<type>/<scope>/<description>`

```bash
git checkout -b feature/cli/add-sync-command
git checkout -b fix/validators/branch-name-regex
git checkout -b docs/readme/improve-quick-start
```

Types: `feature`, `fix`, `docs`, `test`, `refactor`, `chore`

Scopes: `cli`, `validators`, `presets`, `templates`, `docs`, `vscode`, `core`

### Commit Messages

Follow conventional commits: `<type>(<scope>): <description>`

```
feat(cli): add sync command for team configuration
fix(validators): correct branch name regex pattern
docs(readme): improve quick start instructions
test(validators): add tests for PR title validation
```

### Code Quality Checklist

**🚨 MANDATORY PRE-COMMIT CHECKLIST - ZERO EXCEPTIONS**

Before committing and pushing ANY code, you MUST complete the following checks. This is part of our "one-and-done" service commitment. See [Pre-Commit Workflow](docs/PRE_COMMIT_WORKFLOW.md) for full details.

**Run the automated check script:**

```bash
./scripts/pre-commit-checks.sh
```

**Or run each check manually:**

- [ ] ✅ **Type check passed** - `pnpm typecheck`
- [ ] ✅ **Lint check passed** - `pnpm lint`
- [ ] ✅ **Format check passed** - `pnpm format`
- [ ] ✅ **Unit tests passed** - `pnpm test`
- [ ] ✅ **Build verification passed** - `pnpm build`

**If ANY check fails:**

1. Fix the errors
2. Commit the fixes
3. Re-run ALL checks from the beginning
4. Do NOT proceed until all checks pass

> 🔒 **ZERO EXCEPTIONS**: No code may be committed that fails any of these checks. This ensures our GitHub Actions pipeline always passes and customers receive quality code the first time.

- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for user-facing changes)

### PR Template

When opening a PR, include:

- **Summary**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Changes**: List of modified files/features
- **Testing**: How was this tested?
- **Screenshots**: For UI changes
- **Breaking Changes**: Any breaking changes?
- **Related Issues**: Links to related issues

## 🎨 Creating Preset Packages

Want to create a preset for a new project type?

1. **Copy an existing preset**:

   ```bash
   cp -r packages/scopes-saas packages/scopes-<name>
   ```

2. **Edit package.json**:
   - Change name to `@workflow/scopes-<name>`
   - Update description and keywords

3. **Edit src/index.ts**:
   - Define your scopes with name, description, emoji
   - Update preset metadata

4. **Test it**:

   ```bash
   pnpm build
   cd /tmp/test-project
   pnpm add -D file:path/to/workflow-agent/packages/scopes-<name>
   ```

5. **Open a PR** with:
   - Description of the project type
   - Example projects using this preset
   - Documentation in README

## 🌍 Translation Guidelines

Translations live in `packages/i18n/locales/`.

1. **Copy en.json** to `<language-code>.json`
2. **Translate all strings** preserving placeholders (`{{variable}}`)
3. **Test your translation**:
   ```bash
   workflow config set language <language-code>
   workflow init
   ```
4. **Open a PR** with:
   - Native speaker review (if possible)
   - Examples of translated UI

## 📚 Documentation

Documentation lives in `docs/` and is built with Next.js + MDX.

- **Guides**: `docs/content/guides/`
- **API Reference**: `docs/content/api/`
- **Examples**: `docs/content/examples/`

To preview docs locally:

```bash
cd docs
pnpm dev
```

## 🐛 Reporting Bugs

Good bug reports include:

1. **Environment**: OS, Node version, pnpm version
2. **Reproduction**: Minimal steps to reproduce
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Logs**: Any error messages or logs
6. **Screenshots**: For UI issues

Use the [bug report template](https://github.com/hawkinsideOut/workflow-agent/issues/new?template=bug_report.md).

## 💡 Suggesting Improvements

Use `workflow suggest` CLI command or [open a discussion](https://github.com/hawkinsideOut/workflow-agent/discussions).

Include:

- **Problem**: What pain point are you experiencing?
- **Solution**: Your proposed solution
- **Alternatives**: Other approaches considered
- **Impact**: Who would benefit from this?

## 🧪 Testing

We use Vitest for unit tests and integration tests.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test packages/core/src/validators/index.test.ts
```

### Writing Tests

- Place test files next to source: `feature.ts` → `feature.test.ts`
- Use descriptive test names: `it('should validate branch name with valid format')`
- Test edge cases and error conditions
- Mock external dependencies

## 📦 Publishing (Maintainers Only)

Publishing is handled by changesets:

```bash
# Create changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish to npm
pnpm release
```

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Give constructive feedback
- Focus on what is best for the community

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

- [GitHub Discussions](https://github.com/hawkinsideOut/workflow-agent/discussions)
- [Discord Community](https://discord.gg/workflow-agent)

---

**Thank you for contributing to Workflow Agent!** 🎉
