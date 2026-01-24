# workflow-agent-cli

> A self-evolving workflow management system for AI-friendly development

[![npm version](https://img.shields.io/npm/v/workflow-agent-cli.svg)](https://www.npmjs.com/package/workflow-agent-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green.svg)](https://nodejs.org/)

**Workflow Agent** is a portable, framework-agnostic CLI tool that brings structure and consistency to your development workflow. It enforces branch naming conventions, validates commit messages, and includes a self-improvement system that learns from community feedback.

**🎯 Perfect for:**

- AI agent development with strict workflow requirements
- Teams maintaining multiple repositories
- Open source projects enforcing contribution guidelines
- Any project needing consistent branch/commit patterns

---

## ✨ Features

- 🎯 **Scope-based workflow** - Organize work with preset or custom scopes
- ✅ **Branch validation** - `<type>/<scope>/<description>` format enforcement
- 📝 **Commit validation** - Conventional commits: `type(scope): description`
- 🔍 **Smart suggestions** - Did-you-mean corrections for typos
- 🎨 **Framework detection** - Auto-detects Next.js, Vite, Remix, Astro, SvelteKit
- 📦 **5 preset libraries** - SaaS (17), Library (10), API (13), E-commerce (12), CMS (13)
- 🎨 **Custom scope builder** - Create domain-specific scope packages with `scope:create`
- 🔄 **Scope migration** - Convert inline scopes to reusable packages with `scope:migrate`
- 🚀 **Interactive CLI** - Beautiful prompts with @clack/prompts
- 🤖 **Non-interactive mode** - CI/CD friendly with `--preset --name --yes`

---

## 🚀 Installation

### Global Installation

```bash
# npm
npm install -g workflow-agent-cli

# pnpm
pnpm add -g workflow-agent-cli

# yarn
yarn global add workflow-agent-cli
```

### Local Installation (Per-Project)

```bash
# npm
npm install -D workflow-agent-cli

# pnpm
pnpm add -D workflow-agent-cli

# yarn
yarn add -D workflow-agent-cli
```

> ⚠️ **pnpm users:** pnpm blocks postinstall scripts by default. After installation, run the setup command to add the workflow script to your package.json:
>
> ```bash
> pnpm workflow-agent setup
> ```

On install (npm/yarn) or after running setup (pnpm), a single **workflow script** is automatically added to your `package.json`:

```json
{
  "scripts": {
    "workflow": "workflow-agent"
  }
}
```

This gives you access to **all workflow commands** through a unified interface:

```bash
# Using npm
npm run workflow -- init
npm run workflow -- validate
npm run workflow -- learn:list

# Using pnpm (recommended)
pnpm workflow init
pnpm workflow validate
pnpm workflow learn:list
pnpm workflow solution:search "pattern"

# Using yarn
yarn workflow init
yarn workflow validate
```

**Note:** When updating from earlier versions, all legacy `workflow:*` scripts are automatically removed and replaced with the single `workflow` script.

---

## 📖 Quick Start

### 1. Initialize Your Project

#### Interactive Mode

```bash
# If installed globally:
workflow-agent init

# If installed locally:
pnpm workflow init
# or
npx workflow-agent init
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

### 2. Validate Your Work

```bash
# Validate branch names
workflow-agent validate branch
workflow-agent validate branch "feature/auth/add-login"

# Validate commit messages
workflow-agent validate commit "feat(auth): add OAuth support"
```

**Expected formats:**

- **Branch:** `<type>/<scope>/<description>`
  - Types: `feature`, `bugfix`, `hotfix`, `chore`, `refactor`, `docs`, `test`
  - Example: `feature/auth/implement-2fa`

- **Commit:** `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`, `ci`, `build`
  - Example: `feat(auth): implement 2FA with TOTP`

### 3. Create Custom Scopes

Build reusable scope packages for your domain:

```bash
workflow-agent scope:create

# Follow the interactive prompts to:
# 1. Name your scope package (e.g., "medical", "finance", "gaming")
# 2. Define scopes (e.g., "patient", "appointment", "billing")
# 3. Add descriptions for each scope
# 4. Choose package location
```

### 4. Migrate Inline Scopes

Convert inline scopes to reusable packages:

```bash
workflow-agent scope:migrate

# Extracts scopes from workflow.config.json
# Creates a new scope package
# Updates config to reference the package
```

---

## 🛠️ Commands

| Command                                    | Description                                 |
| ------------------------------------------ | ------------------------------------------- |
| `workflow-agent init`                      | Initialize project with interactive prompts |
| `workflow-agent validate branch [name]`    | Validate branch name format                 |
| `workflow-agent validate commit [message]` | Validate commit message format              |
| `workflow-agent config get [key]`          | View configuration values                   |
| `workflow-agent config set <key> <value>`  | Update configuration                        |
| `workflow-agent suggest <idea>`            | Submit improvement suggestion               |
| `workflow-agent doctor`                    | Run health checks and get optimization tips |
| `workflow-agent scope:create`              | Create a custom scope package               |
| `workflow-agent scope:migrate`             | Migrate inline scopes to package            |
| `workflow-agent learn:record`              | Record a new fix pattern or blueprint       |
| `workflow-agent learn:list`                | List recorded patterns                      |
| `workflow-agent learn:apply <id>`          | Apply a pattern to current project          |
| `workflow-agent learn:sync`                | Sync patterns with community registry       |
| `workflow-agent learn:config`              | Configure learning settings                 |
| `workflow-agent learn:stats`               | View learning statistics                    |
| `workflow-agent update-templates`          | Update guideline templates from package     |
| `workflow-agent docs:validate`             | Validate document references in markdown    |

### Command Options

#### `update-templates`

- `--force` - Overwrite existing template files with latest versions
- `--skip` - Skip update (useful in CI pipelines)

#### `docs:validate`

- `--fix` - Interactively fix broken references
- `--patterns <patterns>` - Custom glob patterns (comma-separated)
- `--ignore <patterns>` - Patterns to ignore (comma-separated)

#### `init`

- `--preset <name>` - Skip preset selection (saas, library, api, ecommerce, cms, custom)
- `--name <name>` - Set project name without prompt
- `--yes` - Accept all defaults (non-interactive)

#### `validate`

- `--fix` - Apply automatic fixes (coming soon)
- `--json` - Output in JSON format

#### `suggest`

- `--category <type>` - Suggestion category (feature, bug, improvement, documentation)
- `--author <name>` - Your name or username

#### `learn:record`

- `--type <type>` - Pattern type: `fix` or `blueprint`
- `--name <name>` - Human-readable pattern name
- `--description <desc>` - What the pattern does
- `--category <cat>` - Fix category: `lint`, `type-error`, `dependency`, `config`, etc.
- `--framework <fw>` - Target framework: `next`, `react`, `vue`, etc.
- `--version <ver>` - Semver version range

#### `learn:list`

- `--type <type>` - Filter by pattern type
- `--framework <fw>` - Filter by framework
- `--deprecated` - Include deprecated patterns

#### `learn:config`

- `--enable-telemetry` - Enable anonymous usage telemetry
- `--disable-telemetry` - Disable telemetry
- `--enable-sync` - Enable community pattern sync
- `--disable-sync` - Disable sync

---

## � Guideline Templates

Workflow Agent provides guideline templates that are installed to your project's `guidelines/` directory. These templates provide consistent documentation for AI agents and team members.

### Mandatory Templates (7 files)

These templates are automatically installed during `workflow init` and `workflow setup`:

| Template                        | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `AGENT_EDITING_INSTRUCTIONS.md` | Core rules for AI agents: implementation plans, coding standards |
| `BRANCHING_STRATEGY.md`         | Git branch naming conventions, PR requirements                   |
| `TESTING_STRATEGY.md`           | Testing pyramid, patterns, when tests are required               |
| `SELF_IMPROVEMENT_MANDATE.md`   | Continuous improvement tracking, changelog requirements          |
| `PATTERN_ANALYSIS_WORKFLOW.md`  | AI workflow for analyzing and extracting patterns                |
| `SINGLE_SOURCE_OF_TRUTH.md`     | Canonical code locations, avoiding duplication                   |
| `LIBRARY_INVENTORY.md`          | Dependency catalog, approved libraries, new library process      |

### Optional Templates

Additional templates available via `workflow update-templates --force`:

| Template                     | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `DEPLOYMENT_STRATEGY.md`     | Deployment workflow, environments, migrations |
| `COMPONENT_LIBRARY.md`       | UI component patterns, design tokens          |
| `SCOPE_CREATION_WORKFLOW.md` | Workflow for creating custom scopes           |
| `CUSTOM_SCOPE_TEMPLATE.md`   | Template for scope package definitions        |
| `PROJECT_TEMPLATE_README.md` | Meta-document describing project structure    |

### Updating Templates

When upgrading to a new version of workflow-agent, run:

```bash
# Check for new/updated templates (interactive)
workflow-agent update-templates

# Force update all templates (overwrites existing)
workflow-agent update-templates --force
```

---

## �📦 Preset Scope Libraries

### SaaS (17 scopes)

`auth`, `billing`, `analytics`, `notifications`, `teams`, `admin`, `api`, `integration`, `subscription`, `dashboard`, `onboarding`, `settings`, `payments`, `reports`, `support`, `webhooks`, `search`

### Library (10 scopes)

`core`, `utils`, `types`, `config`, `cli`, `api`, `docs`, `examples`, `test`, `build`

### API (13 scopes)

`routes`, `middleware`, `controllers`, `models`, `services`, `auth`, `validation`, `errors`, `logging`, `cache`, `queue`, `websocket`, `graphql`

### E-commerce (12 scopes)

`products`, `cart`, `checkout`, `orders`, `payments`, `shipping`, `inventory`, `customers`, `reviews`, `discounts`, `recommendations`, `analytics`

### CMS (13 scopes)

`content`, `media`, `pages`, `posts`, `categories`, `tags`, `users`, `comments`, `seo`, `templates`, `widgets`, `api`, `admin`

---

## 🎨 Custom Scopes

Create domain-specific scope packages:

```bash
workflow-agent scope:create
```

**Example: Medical Scope Package**

```typescript
// packages/scopes-medical/src/index.ts
export default {
  scopes: [
    { name: "patient", description: "Patient records and profiles" },
    { name: "appointment", description: "Scheduling and appointments" },
    { name: "billing", description: "Medical billing and insurance" },
    { name: "prescription", description: "Prescriptions and medications" },
    { name: "lab", description: "Laboratory tests and results" },
  ],
};
```

**Use in workflow.config.json:**

```json
{
  "name": "medical-app",
  "scopesSource": "packages/scopes-medical"
}
```

For detailed instructions, see the [Custom Scopes Documentation](https://github.com/hawkinsideOut/workflow-agent/blob/main/docs/content/custom-scopes.mdx).

---

## 🐛 Troubleshooting

### Installation Issues

#### pnpm Installation with Postinstall

If you're using pnpm, postinstall scripts are blocked by default. Run setup manually:

```bash
pnpm add -D workflow-agent-cli
pnpm workflow-agent setup
```

#### Permission Errors (Global Install)

```bash
# Linux/macOS
sudo npm install -g workflow-agent-cli

# Or use nvm to avoid sudo
nvm use system
npm install -g workflow-agent-cli
```

### Publishing Issues (For Contributors)

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

### Template Issues

**Error: Guidelines directory not created**

If templates aren't bundled with the npm package:

1. **Ensure templates are in the package:**

   ```json
   // packages/core/package.json
   {
     "files": ["dist", "templates"]
   }
   ```

2. **Copy templates to package directory:**

   ```bash
   cp -r templates packages/core/
   ```

3. **Update template paths** in code to use relative paths from the package

---

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/hawkinsideOut/workflow-agent/blob/main/CONTRIBUTING.md).

### Development Setup

```bash
# Clone the repository
git clone https://github.com/hawkinsideOut/workflow-agent.git
cd workflow-agent

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the CLI locally
node packages/core/dist/cli/index.js --help
```

---

## 📄 License

MIT © Workflow Agent Team

See [LICENSE](https://github.com/hawkinsideOut/workflow-agent/blob/main/LICENSE) for details.

---

## 🔗 Links

- [GitHub Repository](https://github.com/hawkinsideOut/workflow-agent)
- [npm Package](https://www.npmjs.com/package/workflow-agent-cli)
- [Documentation](https://github.com/hawkinsideOut/workflow-agent/tree/main/docs)
- [Custom Scopes Guide](https://github.com/hawkinsideOut/workflow-agent/blob/main/docs/content/custom-scopes.mdx)
- [Issue Tracker](https://github.com/hawkinsideOut/workflow-agent/issues)
- [Changelog](https://github.com/hawkinsideOut/workflow-agent/blob/main/CHANGELOG.md)

---

**Made with ❤️ for developers who value consistency and automation**
