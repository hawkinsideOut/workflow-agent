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

**Setup Scripts (Recommended):**

pnpm blocks postinstall scripts by default, so run the setup command after installation:

```bash
# If using pnpm or npm locally:
pnpm workflow-agent setup
# or
npx workflow-agent setup

# If installed globally:
workflow-agent setup
```

This adds these scripts to your `package.json`:

```json
{
  "scripts": {
    "workflow:init": "workflow-agent init",
    "workflow:validate": "workflow-agent validate",
    "workflow:suggest": "workflow-agent suggest",
    "workflow:doctor": "workflow-agent doctor"
  }
}
```

---

## 📖 Quick Start

### 1. Initialize Your Project

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

| Command | Description |
|---------|-------------|
| `workflow-agent init` | Initialize project with interactive prompts |
| `workflow-agent validate branch [name]` | Validate branch name format |
| `workflow-agent validate commit [message]` | Validate commit message format |
| `workflow-agent config get [key]` | View configuration values |
| `workflow-agent config set <key> <value>` | Update configuration |
| `workflow-agent suggest <idea>` | Submit improvement suggestion |
| `workflow-agent doctor` | Run health checks and get optimization tips |
| `workflow-agent scope:create` | Create a custom scope package |
| `workflow-agent scope:migrate` | Migrate inline scopes to package |

### Command Options

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

---

## 📦 Preset Scope Libraries

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
    { name: 'patient', description: 'Patient records and profiles' },
    { name: 'appointment', description: 'Scheduling and appointments' },
    { name: 'billing', description: 'Medical billing and insurance' },
    { name: 'prescription', description: 'Prescriptions and medications' },
    { name: 'lab', description: 'Laboratory tests and results' }
  ]
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
