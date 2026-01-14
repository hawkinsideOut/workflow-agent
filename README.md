# Workflow Agent 🚀

> A self-evolving workflow management system for AI-friendly development

[![npm version](https://img.shields.io/npm/v/@hawkinside_out/workflow-agent.svg)](https://www.npmjs.com/package/@hawkinside_out/workflow-agent)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/workflow-agent.workflow-agent.svg)](https://marketplace.visualstudio.com/items?itemName=workflow-agent.workflow-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green.svg)](https://nodejs.org/)
[![CI](https://github.com/workflow-agent/workflow-agent/workflows/CI/badge.svg)](https://github.com/workflow-agent/workflow-agent/actions)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

**Workflow Agent** is a portable, framework-agnostic tool that brings structure and consistency to your development workflow. Born from real-world needs at [ProjectHub](https://github.com/hawkinsideOut/projecthub), it enforces branch naming conventions, validates commit messages, and includes a self-improvement system that learns from community feedback.

**🎯 Perfect for:**
- AI agent development with strict workflow requirements
- Teams maintaining multiple repositories
- Open source projects enforcing contribution guidelines
- Any project needing consistent branch/commit patterns

---

## ✨ Features

### Core Functionality
- 🎯 **Scope-based workflow** - Organize work with preset or custom scopes
- ✅ **Branch validation** - `<type>/<scope>/<description>` format enforcement
- 📝 **Commit validation** - Conventional commits: `type(scope): description`
- 🔍 **Smart suggestions** - Did-you-mean corrections for typos
- 🎨 **Framework detection** - Auto-detects Next.js, Vite, Remix, Astro, SvelteKit
- 📦 **5 preset libraries** - SaaS (17), Library (10), API (13), E-commerce (12), CMS (13)

### Self-Improvement System
- 💡 **Community suggestions** - Submit improvement ideas via CLI
- 🛡️ **Content moderation** - Spam filtering, rate limiting, trust scores
- 👥 **Trust scoring** - Earn reputation through quality contributions
- 📊 **Voting system** - Community upvote/downvote suggestions
- 🔄 **Automatic integration** - Approved suggestions go into future releases

### Developer Experience
- 🚀 **Interactive CLI** - Beautiful prompts with @clack/prompts
- 🤖 **Non-interactive mode** - CI/CD friendly with `--preset --name --yes`
- 📋 **Template system** - Generate customized project guidelines
- 🔧 **Health checks** - `workflow-agent doctor` for optimization suggestions

---

## 🚀 Installation

### From Source (Current)

```bash
# Clone the repository
git clone https://github.com/workflow-agent/workflow-agent.git
cd workflow-agent

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Use the CLI
node packages/core/dist/cli/index.js --help
```

### From npm

#### Global Installation

```bash
# npm
npm install -g @hawkinside_out/workflow-agent --ignore-scripts

# pnpm
pnpm add -g @hawkinside_out/workflow-agent --ignore-scripts
```

#### Local Installation (Per-Project)

```bash
# npm
npm install -D @hawkinside_out/workflow-agent

# pnpm
pnpm add -D @hawkinside_out/workflow-agent
```

**pnpm users:** pnpm blocks postinstall scripts by default. Run the setup command after installation:

```bash
pnpm workflow-agent setup
# or
npx workflow-agent setup
```

This will add workflow scripts to your `package.json`:

When installed locally, run commands via:

```bash
# pnpm
pnpm workflow-agent init

# npx
npx workflow-agent init

# package.json scripts
{
  "scripts": {
    "workflow:init": "workflow-agent init",
    "workflow:validate": "workflow-agent validate branch feature/add-auth",
    "workflow:doctor": "workflow-agent doctor"
  }
}
```

---

## 📖 Usage

### Initialize a Project

#### Interactive Mode
```bash
workflow-agent init
```

Prompts you to:
1. Enter project name
2. Choose a preset (SaaS, Library, API, E-commerce, CMS, Custom)
3. Generate guidelines (optional)

#### Non-Interactive Mode
```bash
# Perfect for CI/CD or automation
workflow-agent init --preset library --name my-project --yes
```

### Validate Your Work

```bash
# Validate current branch name
workflow-agent validate branch

# Validate specific branch
workflow-agent validate branch "feature/auth/add-login"

# Validate commit message
workflow-agent validate commit "feat(auth): add OAuth support"

# Validate PR title
workflow-agent validate pr "fix(api): handle rate limiting"
```

**Expected formats:**
- **Branch:** `<type>/<scope>/<description>`
  - Types: `feature`, `bugfix`, `hotfix`, `chore`, `refactor`, `docs`, `test`
  - Example: `feature/auth/implement-2fa`

- **Commit:** `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`, `ci`, `build`
  - Example: `feat(auth): implement 2FA with TOTP`

### Submit Improvements

```bash
# Submit a suggestion
workflow-agent suggest "Add support for GitLab repositories" \
  --category feature \
  --author "your-username"

# Suggestions are moderated and stored in .workflow/improvements/
```

**Moderation Rules:**
- 5 suggestions per day per user
- 10-1000 characters
- Spam filtered
- Trust score affects approval speed

### Check Project Health

```bash
workflow-agent doctor
```

Analyzes your project for:
- Configuration issues
- Optimization opportunities
- Best practice violations

---

## 📦 Preset Libraries

Choose a preset during `workflow-agent init` or create custom scopes:

### @workflow/scopes-saas (17 scopes)
Perfect for SaaS applications:
```
auth, tasks, boards, sprints, epics, comments, notifications, 
settings, admin, ui, api, db, deps, docs, test, perf, infra
```

### @workflow/scopes-library (10 scopes)
For npm packages and libraries:
```
types, ui, core, build, docs, test, examples, deps, perf, api
```

### @workflow/scopes-api (13 scopes)
Backend services and APIs:
```
auth, api, endpoints, middleware, validators, db, migrations, 
models, services, docs, test, infra, deps
```

### @workflow/scopes-ecommerce (12 scopes)
E-commerce platforms:
```
cart, checkout, products, orders, payments, inventory, auth, 
admin, analytics, ui, db, deps
```

### @workflow/scopes-cms (13 scopes)
Content management systems:
```
content, media, pages, editor, templates, collections, auth, 
workflows, publishing, ui, db, test, deps
```

---

## 🎨 Framework Adapters

Workflow Agent automatically detects your framework and adapts path structures:

| Framework | Detection | Status |
|-----------|-----------|--------|
| Next.js (App Router) | `next.config.ts/js` + `app/` | ✅ |
| Next.js (Pages) | `next.config.ts/js` + `pages/` | ✅ |
| Vite + React | `vite.config.ts/js` | ✅ |
| Remix | `remix.config.js` | ✅ |
| Astro | `astro.config.mjs` | ✅ |
| SvelteKit | `svelte.config.js` | ✅ |
| Generic | (fallback) | ✅ |

**Path structures are customized per framework:**
```typescript
// Next.js App Router
{
  components: 'app/',
  lib: 'lib/',
  hooks: 'hooks/',
  types: 'types/'
}

// Vite + React
{
  components: 'src/components/',
  lib: 'src/lib/',
  hooks: 'src/hooks/',
  types: 'src/types/'
}
```

---

## 🔧 Configuration

Create `workflow.config.json` in your project root:

```json
{
  "projectName": "my-awesome-project",
  "scopes": [
    { "name": "auth", "description": "Authentication", "emoji": "🔐" },
    { "name": "ui", "description": "User interface", "emoji": "🎨" },
    { "name": "api", "description": "API endpoints", "emoji": "🔌" }
  ],
  "enforcement": "strict",
  "language": "en"
}
```

**Configuration options:**
- `projectName` - Your project name
- `scopes` - Array of scope definitions
- `enforcement` - `strict` | `advisory` | `learning`
- `language` - `en` (more coming soon)
- `adapter` - Override auto-detection
- `syncRemote` - Team sync endpoint (optional)

---

## 💡 Self-Improvement System

Workflow Agent includes a complete improvement tracking system with moderation:

### Architecture

```
.workflow/improvements/
  └── {uuid}.json        # Each suggestion stored as JSON
```

### Trust Score System

Contributors earn trust through quality contributions:

| Action | Points |
|--------|--------|
| Merged PR | +10 |
| Helpful review | +5 |
| Quality bug report | +3 |
| Approved suggestion | +5 |
| Spam | -50 |

**Trust score affects:**
- **80+**: Auto-approved suggestions
- **50-79**: Reviewed within 24h
- **20-49**: Reviewed within 1 week
- **<20**: Manual review required

### Moderation Rules

1. **Rate limiting**: 5 suggestions per day
2. **Length**: 10-1000 characters
3. **Spam filter**: Banned word list
4. **Trust threshold**: Low scores require review

---

## 📚 Template System

Generate customized project guidelines:

```bash
workflow-agent init --preset saas --name my-app
# Generates guidelines in guidelines/ directory
```

**Templates include:**
- `AGENT_EDITING_INSTRUCTIONS.md` - Core agent rules
- `BRANCHING_STRATEGY.md` - Branch naming conventions
- `TESTING_STRATEGY.md` - Testing requirements
- `COMPONENT_LIBRARY.md` - UI patterns
- `DEPLOYMENT_STRATEGY.md` - Deployment workflows
- `LIBRARY_INVENTORY.md` - Dependency catalog
- `SINGLE_SOURCE_OF_TRUTH.md` - Canonical code locations
- `SELF_IMPROVEMENT_MANDATE.md` - Improvement tracking rules

**Variable substitution:**
- `{{projectName}}` - Your project name
- `{{framework}}` - Detected framework
- `{{scopes}}` - Comma-separated scopes
- `{{scopeList}}` - Markdown scope list
- `{{pathStructure}}` - Path structure code block
- `{{enforcement}}` - Enforcement level
- `{{year}}` - Current year

---

## 🧪 Testing

Run tests with Vitest:

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

**Current test coverage:**
- improvement-tracker: 14 tests, 71% pass rate
- validators: Coming soon
- adapters: Coming soon

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
1. 🐛 Report bugs
2. 💡 Submit improvement suggestions via `workflow-agent suggest`
3. 🔧 Fix issues and submit PRs
4. 📦 Create preset packages for new project types
5. 🌍 Add translations
6. 📚 Improve documentation

**Workflow Agent dogfoods itself!** Follow the same workflow patterns:
- Branch: `feature/<scope>/<description>`
- Commit: `type(scope): description`
- Run tests before pushing

---

## 📄 License

MIT © Workflow Agent Team

See [LICENSE](LICENSE) for details.

---

## 🗺️ Roadmap

### Phase 2 (In Progress)
- [x] Improvement tracking system
- [x] Non-interactive mode
- [x] Unit tests
- [ ] VS Code extension
- [ ] Documentation site

### Phase 3 (Planned)
- [ ] npm publication
- [ ] GitHub App for PR validation
- [ ] Migration detection (`--migrate`)
- [ ] JetBrains plugin
- [ ] Multilingual i18n

### Phase 4 (Future)
- [ ] Team sync server
- [ ] Analytics dashboard
- [ ] Preset marketplace
- [ ] AI-powered suggestion prioritization

---

## 🙏 Acknowledgments

- Inspired by [Conventional Commits](https://www.conventionalcommits.org/)
- Built with [Commander.js](https://github.com/tj/commander.js), [@clack/prompts](https://github.com/natemoo-re/clack), and [Zod](https://github.com/colinhacks/zod)
- Originally extracted from [ProjectHub](https://github.com/hawkinsideOut/projecthub)

---

**Made with ❤️ by developers, for developers**

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🌟 Reference Implementation

This tool was extracted from [ProjectHub](https://github.com/hawkinsideOut/projecthub) - a comprehensive SaaS project management application that uses @hawkinside_out/workflow-agent for its own development.
