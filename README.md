# Workflow Agent 🚀

> A self-evolving workflow management system for AI-friendly development

[![npm version](https://img.shields.io/npm/v/@hawkinside_out/workflow-agent.svg)](https://www.npmjs.com/package/@hawkinside_out/workflow-agent)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/workflow-agent.workflow-agent.svg)](https://marketplace.visualstudio.com/items?itemName=workflow-agent.workflow-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green.svg)](https://nodejs.org/)
[![CI](https://github.com/hawkinsideOut/workflow-agent/workflows/CI/badge.svg)](https://github.com/hawkinsideOut/workflow-agent/actions)
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
- 🎨 **Custom scope builder** - Create domain-specific scope packages with `scope:create`
- 🔄 **Scope migration** - Convert inline scopes to reusable packages with `scope:migrate`

### Self-Improvement System

- 💡 **Community suggestions** - Submit improvement ideas via CLI
- 🛡️ **Content moderation** - Spam filtering, rate limiting, trust scores
- 👥 **Trust scoring** - Earn reputation through quality contributions
- 📊 **Voting system** - Community upvote/downvote suggestions
- 🔄 **Automatic integration** - Approved suggestions go into future releases

### Agent Learning System

- 🧠 **Pattern recording** - Capture successful fixes and project setups
- � **Solution patterns** - Learn from working code examples across projects
- 🔍 **Code analysis** - Automatic detection of dependencies, env vars, and architecture
- 📦 **Pattern library** - Search, apply, and share reusable implementations
- �🔒 **Privacy-first** - PII automatically anonymized before sharing
- 📈 **Telemetry** - Track pattern success rates (opt-in)
- 🔄 **Community sync** - Share patterns with the ecosystem
- ⏰ **Auto-deprecation** - Unused patterns deprecate after 1 year

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
git clone https://github.com/hawkinsideOut/workflow-agent.git
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
npm install -g @hawkinside_out/workflow-agent

# pnpm
pnpm add -g @hawkinside_out/workflow-agent
```

#### Local Installation (Per-Project)

```bash
# npm
npm install -D @hawkinside_out/workflow-agent

# pnpm
pnpm add -D @hawkinside_out/workflow-agent
```

> ⚠️ **pnpm users:** pnpm blocks postinstall scripts by default. After installation, run the setup command to add workflow scripts to your package.json:
>
> ```bash
> pnpm workflow-agent setup
> ```

On install (npm/yarn) or after running setup (pnpm), **38 workflow scripts** are automatically added to your `package.json`:

```json
{
  "scripts": {
    // Core Commands
    "workflow:init": "workflow-agent init",
    "workflow:validate": "workflow-agent validate",
    "workflow:config": "workflow-agent config",
    "workflow:suggest": "workflow-agent suggest",
    "workflow:setup": "workflow-agent setup",
    "workflow:doctor": "workflow-agent doctor",

    // Scope Commands
    "workflow:scope:create": "workflow-agent scope:create",
    "workflow:scope:migrate": "workflow-agent scope:migrate",

    // Verification
    "workflow:verify": "workflow-agent verify",
    "workflow:verify:fix": "workflow-agent verify --fix",
    "workflow:auto-setup": "workflow-agent auto-setup",

    // Learning System
    "workflow:learn": "workflow-agent learn:list",
    "workflow:learn:record": "workflow-agent learn:record",
    "workflow:learn:list": "workflow-agent learn:list",
    "workflow:learn:apply": "workflow-agent learn:apply",
    "workflow:learn:publish": "workflow-agent learn:publish",
    "workflow:learn:sync": "workflow-agent learn:sync",
    "workflow:learn:config": "workflow-agent learn:config",
    "workflow:learn:deprecate": "workflow-agent learn:deprecate",
    "workflow:learn:stats": "workflow-agent learn:stats",

    // Solution Patterns
    "workflow:solution": "workflow-agent solution:list",
    "workflow:solution:capture": "workflow-agent solution:capture",
    "workflow:solution:search": "workflow-agent solution:search",
    "workflow:solution:list": "workflow-agent solution:list",
    "workflow:solution:apply": "workflow-agent solution:apply",
    "workflow:solution:deprecate": "workflow-agent solution:deprecate",
    "workflow:solution:stats": "workflow-agent solution:stats",

    // Advisory Board
    "workflow:advisory": "workflow-agent advisory",
    "workflow:advisory:quick": "workflow-agent advisory --depth quick",
    "workflow:advisory:standard": "workflow-agent advisory --depth standard",
    "workflow:advisory:comprehensive": "workflow-agent advisory --depth comprehensive",
    "workflow:advisory:executive": "workflow-agent advisory --depth executive",
    "workflow:advisory:ci": "workflow-agent advisory --ci"
  }
}
```

**Note:** When you update the package, any new scripts from newer versions are automatically added.

Run commands via:

```bash
pnpm run workflow:init
# or
npm run workflow:init
```

---

## 📖 Usage

### Initialize a Project

#### Interactive Mode

```bash
# If installed globally:
workflow-agent init

# If installed locally:
pnpm workflow-agent init
# or
npx workflow-agent init
# or (after running setup):
pnpm run workflow:init
```

Prompts you to:

1. Enter project name
2. Choose a preset (SaaS, Library, API, E-commerce, CMS, Custom)
3. Generate guidelines (optional)

#### Non-Interactive Mode

```bash
# Perfect for CI/CD or automation

# Global:
workflow-agent init --preset library --name my-project --yes

# Local:
pnpm workflow-agent init --preset library --name my-project --yes
```

### Validate Your Work

```bash
# Global installation:
workflow-agent validate branch
workflow-agent validate branch "feature/auth/add-login"
workflow-agent validate commit "feat(auth): add OAuth support"

# Local installation:
pnpm workflow-agent validate branch
pnpm run workflow:validate branch
npx workflow-agent validate commit "feat(auth): add OAuth support"
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
# Global:
workflow-agent suggest "Add support for GitLab repositories" \
  --category feature \
  --author "your-username"

# Local:
pnpm workflow-agent suggest "Add support for GitLab repositories" \
  --category feature \
  --author "your-username"
# or
pnpm run workflow:suggest "Add support for GitLab repositories"

# Suggestions are moderated and stored in .workflow/improvements/
```

### Build Custom Scope Packages

#### Create a new custom scope package:

```bash
workflow-agent scope:create
```

Follow the interactive prompts to:

- Name your package (e.g., "fintech", "healthcare", "gaming")
- Define 8-15 scopes with names, descriptions, emojis, and categories
- Automatically generate package structure with tests
- Get publishing instructions for npm

#### Migrate existing scopes to a package:

```bash
workflow-agent scope:migrate
```

Converts your inline scopes from `workflow.config.json` into a standalone, reusable package.

**Non-interactive mode:**

```bash
workflow-agent scope:create \
  --name fintech \
  --preset-name "FinTech Platform" \
  --scopes "accounts:Account management:👤:features,payments:Payment processing:💳:features"
```

**Learn more:** See the [Custom Scopes Guide](docs/content/custom-scopes.mdx)

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

### Solution Patterns

Capture and reuse working code implementations across projects:

#### Capture a Solution

```bash
# Interactive mode
workflow-agent solution:capture

# With options
workflow-agent solution:capture \
  --path ./src/auth \
  --name "JWT Authentication" \
  --category auth \
  --tags "jwt,security"
```

#### Search for Solutions

```bash
# Search by keyword
workflow-agent solution:search "authentication"

# With category filter
workflow-agent solution:search "user login" --category auth
```

#### List All Solutions

```bash
# List all patterns
workflow-agent solution:list

# Filter by category
workflow-agent solution:list --category auth
```

#### Apply a Solution

```bash
# Apply to current project
workflow-agent solution:apply sol_abc123

# Dry run (preview only)
workflow-agent solution:apply sol_abc123 --dry-run
```

#### View Statistics

```bash
workflow-agent solution:stats
```

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

### Custom Scopes

**Don't see a preset that fits your domain?** Create a custom scope package!

#### Create from scratch:

```bash
workflow-agent scope:create
```

This interactive CLI will:

1. Guide you through defining 8-15 scopes
2. Generate a complete package structure
3. Include automatic test suite
4. Support monorepo detection
5. Provide publishing instructions

#### Migrate existing scopes:

```bash
workflow-agent scope:migrate
```

Converts inline scopes from `workflow.config.json` into a reusable package for sharing across projects.

**Example custom domains:**

- **FinTech:** accounts, transactions, payments, compliance, kyc
- **Healthcare:** patients, appointments, prescriptions, lab-results
- **Gaming:** players, matches, inventory, leaderboards, guilds
- **Education:** courses, students, assignments, grading, enrollment

**Learn more:** See [Custom Scopes Documentation](docs/content/custom-scopes.mdx)

---

## 🎨 Framework Adapters

Workflow Agent automatically detects your framework and adapts path structures:

| Framework            | Detection                      | Status |
| -------------------- | ------------------------------ | ------ |
| Next.js (App Router) | `next.config.ts/js` + `app/`   | ✅     |
| Next.js (Pages)      | `next.config.ts/js` + `pages/` | ✅     |
| Vite + React         | `vite.config.ts/js`            | ✅     |
| Remix                | `remix.config.js`              | ✅     |
| Astro                | `astro.config.mjs`             | ✅     |
| SvelteKit            | `svelte.config.js`             | ✅     |
| Generic              | (fallback)                     | ✅     |

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

| Action              | Points |
| ------------------- | ------ |
| Merged PR           | +10    |
| Helpful review      | +5     |
| Quality bug report  | +3     |
| Approved suggestion | +5     |
| Spam                | -50    |

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

🚨 **MANDATORY**: Run pre-commit checks before pushing. Agent automatically configures missing tools. See [Pre-Commit Workflow](docs/PRE_COMMIT_WORKFLOW.md) and [Auto-Setup](docs/AUTO_SETUP_TOOLS.md) for details.

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
- 🚨 **MANDATORY**: Run pre-commit checks before pushing (see [Pre-Commit Workflow](docs/PRE_COMMIT_WORKFLOW.md))

**"One-and-Done" Commitment:**  
All contributions must pass our [mandatory pre-commit checklist](docs/PRE_COMMIT_WORKFLOW.md) with zero exceptions. This ensures quality and reliability for our customers.

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

## � Troubleshooting

### Publishing Issues

#### npm Token Errors

**Error: "Access token expired or revoked" or "404 Not Found"**

This typically means your npm token doesn't have the correct permissions. To fix:

1. **Create a Granular Access Token on npm:**
   - Go to https://www.npmjs.com/ → Profile → Access Tokens
   - Click "Generate New Token" → Select "Granular Access Token"
   - Configure:
     - **Packages and scopes**: Select **"All packages"** + **"Read and write"**
     - **Organizations**: Leave **unchecked/empty** (unless publishing under an org)
     - **Token type**: Should support automation/bypass 2FA
   - Copy the token immediately

2. **Test the token locally:**

   ```bash
   echo '//registry.npmjs.org/:_authToken=YOUR_TOKEN' > ~/.npmrc
   npm whoami  # Should show your npm username
   cd packages/core
   npm publish --access public --dry-run  # Should succeed
   ```

3. **Update GitHub Secret:**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Update `NPM_TOKEN` with the exact token that works locally

**Error: "This operation requires a one-time password (EOTP)"**

Your npm account has 2FA enabled. Options:

1. **Use an Automation token** that bypasses 2FA (recommended)
2. **Disable 2FA for publishing** (keeps it for login):
   - Go to npm → Account Settings → Two-Factor Authentication
   - Change from "Authorization and Publishing" to "Authorization only"

#### Package Name Conflicts

**Error: "must not have multiple workspaces with the same name"**

If you have workspace packages with duplicate names:

1. **Check all package.json files** in `packages/*/package.json`
2. **Rename conflicting packages:**
   ```bash
   # Example: rename vscode-extension to avoid conflict
   # packages/vscode-extension/package.json
   { "name": "workflow-agent-vscode" }
   ```
3. **Update imports** in dependent packages
4. **Run `pnpm install`** to update lockfile

#### Lockfile Out of Sync

**Error: "Cannot install with frozen-lockfile because pnpm-lock.yaml is not up to date"**

After changing package dependencies:

```bash
pnpm install  # Update lockfile
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
```

### Build Issues

#### TypeScript Compilation Errors

**Error: "Cannot find module 'workflow-agent-cli/config'"**

This means the core package wasn't built before dependent packages:

```bash
# Build core package first
pnpm --filter workflow-agent-cli run build

# Then build everything
pnpm build
```

**Fix permanently** by updating the root `package.json`:

```json
{
  "scripts": {
    "build": "pnpm --filter workflow-agent-cli run build && pnpm -r run build"
  }
}
```

#### MDX Syntax Errors in Documentation

**Error: "Unexpected character before name" in MDX files**

MDX interprets certain characters as JSX:

````mdx
<!-- Bad: MDX tries to parse as JSX -->

Too few (<5) items
Use {name} for variables

<!-- Good: Escape or use code blocks -->

Too few (&lt;5) items
Use `{name}` for variables

```text
Or wrap in text code blocks: {name}
```
````

````

### Template Issues

**Error: Guidelines directory not created**

If templates aren't bundled with the npm package:

1. **Ensure templates are in the package:**
   ```json
   // packages/core/package.json
   {
     "files": ["dist", "templates"]
   }
````

2. **Copy templates to package directory:**

   ```bash
   cp -r templates packages/core/
   ```

3. **Update template paths** in code to use relative paths from the package

### Local Publishing

If GitHub Actions publishing continues to fail, you can publish locally:

```bash
# Ensure you're authenticated
npm whoami

# Build the package
cd packages/core
pnpm build

# Publish
npm publish --access public
```

---

## �🙏 Acknowledgments

- Inspired by [Conventional Commits](https://www.conventionalcommits.org/)
- Built with [Commander.js](https://github.com/tj/commander.js), [@clack/prompts](https://github.com/natemoo-re/clack), and [Zod](https://github.com/colinhacks/zod)
- Originally extracted from [ProjectHub](https://github.com/hawkinsideOut/projecthub)

---

**Made with ❤️ by developers, for developers**

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🌟 Reference Implementation

This tool was extracted from [ProjectHub](https://github.com/hawkinsideOut/projecthub) - a comprehensive SaaS project management application that uses @hawkinside_out/workflow-agent for its own development.
