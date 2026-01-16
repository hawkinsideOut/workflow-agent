# Auto-Setup: Mandatory Check Tools

> **Policy Status**: 🔒 **MANDATORY - AUTOMATIC**  
> **Purpose**: Ensure every project can meet quality standards  
> **Agent Responsibility**: Full automation, no permission needed

---

## Overview

If any of the 5 mandatory pre-commit check tools (typecheck, lint, format, test, build) are not configured in a project, **Agent MUST automatically set them up** based on industry best practices before running checks.

## Core Principle

**Zero Configuration Friction**: Agent doesn't ask—Agent configures. Every project should have the tools needed to maintain quality standards, and Agent takes full responsibility for setting them up correctly.

---

## Auto-Setup Rules

### Detection Phase

Before running any pre-commit check, Agent MUST verify:

1. Configuration file exists for each tool
2. Corresponding npm/pnpm script exists in `package.json`
3. Required dependencies are installed

If ANY tool is missing, Agent proceeds to auto-setup phase.

---

## 1. TypeScript Configuration

### Detection

Check for:

- `tsconfig.json` file exists
- `typecheck` script in `package.json`
- `typescript` in `devDependencies`

### Auto-Setup Actions

#### Step 1: Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build", ".next", "coverage"]
}
```

**For monorepos**, adjust to:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

#### Step 2: Add Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

**For monorepos**, add at root:

```json
{
  "scripts": {
    "typecheck": "pnpm -r run typecheck"
  }
}
```

#### Step 3: Install Dependencies

```bash
pnpm add -D typescript @types/node
```

---

## 2. ESLint Configuration

### Detection

Check for:

- ESLint config file (`.eslintrc*`, `eslint.config.*`)
- `lint` script in `package.json`
- `eslint` in `devDependencies`

### Auto-Setup Actions

#### Step 1: Create `eslint.config.mjs` (Flat Config)

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist", "build", ".next", "coverage", "node_modules"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
```

**Alternative: Classic `.eslintrc.json`** (if project uses older Node):

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "ignorePatterns": ["dist", "build", ".next", "coverage"]
}
```

#### Step 2: Create `.eslintignore`

```
node_modules
dist
build
.next
coverage
*.min.js
*.config.js
```

#### Step 3: Add Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix"
  }
}
```

**For monorepos**:

```json
{
  "scripts": {
    "lint": "pnpm -r run lint"
  }
}
```

#### Step 4: Install Dependencies

```bash
pnpm add -D eslint @eslint/js typescript-eslint
```

---

## 3. Prettier Configuration

### Detection

Check for:

- Prettier config file (`.prettierrc*`, `prettier.config.*`)
- `format` script in `package.json`
- `prettier` in `devDependencies`

### Auto-Setup Actions

#### Step 1: Create `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### Step 2: Create `.prettierignore`

```
node_modules
dist
build
.next
coverage
*.min.js
pnpm-lock.yaml
package-lock.json
yarn.lock
.turbo
.cache
```

#### Step 3: Add Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\""
  }
}
```

#### Step 4: Install Dependencies

```bash
pnpm add -D prettier
```

---

## 4. Test Framework Configuration

### Detection

Check for:

- Test config file (`vitest.config.*`, `jest.config.*`, `*.test.*` files)
- `test` script in `package.json`
- Test framework in `devDependencies`

### Auto-Setup Actions

Agent sets up **Vitest** (modern, fast, Vite-powered):

#### Step 1: Create `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "build"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["**/*.config.*", "**/dist/**", "**/node_modules/**"],
    },
  },
});
```

#### Step 2: Add Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### Step 3: Create Sample Test

If **no test files exist**, create `src/example.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("Example Test Suite", () => {
  it("should pass basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle strings", () => {
    expect("hello").toMatch(/hello/);
  });
});
```

#### Step 4: Install Dependencies

```bash
pnpm add -D vitest @vitest/coverage-v8
```

---

## 5. Build Configuration

### Detection

Check for:

- Build config file (`tsup.config.*`, `vite.config.*`, `next.config.*`, etc.)
- `build` script in `package.json`
- Build tool in `devDependencies`

### Auto-Setup Actions

Agent chooses build tool based on project type:

### For TypeScript Libraries: tsup

#### Step 1: Create `tsup.config.ts`

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: "es2022",
});
```

#### Step 2: Add Scripts

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
```

#### Step 3: Install Dependencies

```bash
pnpm add -D tsup
```

---

## Auto-Setup Workflow

### Complete Execution Flow

```
┌─────────────────────────────────────┐
│  Agent Ready to Commit              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Phase 0: Tool Detection            │
├─────────────────────────────────────┤
│  • Check tsconfig.json              │
│  • Check ESLint config              │
│  • Check Prettier config            │
│  • Check test config                │
│  • Check build config               │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    All Found    Missing Tools
         │           │
         │           ▼
         │     ┌─────────────────────┐
         │     │  Install Dependencies│
         │     └──────────┬───────────┘
         │                │
         │                ▼
         │     ┌─────────────────────┐
         │     │  Create Config Files │
         │     └──────────┬───────────┘
         │                │
         │                ▼
         │     ┌─────────────────────┐
         │     │  Update package.json │
         │     └──────────┬───────────┘
         │                │
         │                ▼
         │     ┌─────────────────────┐
         │     │  Verify Setup Works  │
         │     └──────────┬───────────┘
         │                │
         │                ▼
         │     ┌─────────────────────┐
         │     │  Commit Setup Changes│
         │     └──────────┬───────────┘
         │                │
         └────────────────┘
                    │
                    ▼
         ┌─────────────────────────┐
         │  Run Pre-Commit Checks  │
         │  (Standard Workflow)    │
         └─────────────────────────┘
```

### When Agent Detects Missing Tools

Agent MUST:

1. **Log detection results**:

   ```
   🔍 Detecting mandatory check tools...
   ├─ ❌ TypeScript: Missing tsconfig.json
   ├─ ❌ ESLint: Missing configuration
   ├─ ✅ Prettier: Configured
   ├─ ❌ Tests: No test framework found
   └─ ✅ Build: tsup configured

   🔧 Auto-setup required for 3 tools
   ```

2. **Install all missing dependencies in one command**:

   ```bash
   pnpm add -D typescript @types/node @eslint/js typescript-eslint vitest @vitest/coverage-v8
   ```

3. **Create all configuration files**

4. **Update package.json with scripts**

5. **Verify each tool works**:

   ```bash
   pnpm typecheck  # Should complete without errors
   pnpm lint       # Should complete without errors
   pnpm test       # Should run sample test
   ```

6. **Commit setup as separate commit**:

   ```bash
   git add .
   git commit -m "chore(setup): configure mandatory pre-commit check tools

   - Add TypeScript configuration (tsconfig.json)
   - Add ESLint configuration (eslint.config.mjs)
   - Add Vitest configuration (vitest.config.ts)
   - Create sample test file
   - Install required dev dependencies
   - Add check scripts to package.json

   Auto-setup by Agent to meet quality standards."
   ```

7. **Continue with standard pre-commit workflow**

---

## Configuration Templates by Project Type

### Node.js CLI Tool

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}

// tsup.config.ts
export default defineConfig({
  entry: { cli: 'src/cli/index.ts' },
  format: ['esm'],
  shims: true,
  banner: { js: '#!/usr/bin/env node' }
});
```

### TypeScript Library

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
```

### Next.js Application

```javascript
// eslint.config.mjs extends Next.js config
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [...compat.extends("next/core-web-vitals", "next/typescript")];
```

### Monorepo (pnpm workspace)

```json
// Root package.json
{
  "scripts": {
    "typecheck": "pnpm -r run typecheck",
    "lint": "pnpm -r run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "test": "pnpm -r run test",
    "build": "pnpm -r run build"
  }
}
```

---

## Post-Setup Verification

After auto-setup, Agent MUST verify each tool:

```bash
echo "🔍 Verifying auto-setup..."

# 1. TypeScript
pnpm typecheck && echo "✅ TypeScript OK" || echo "❌ TypeScript FAILED"

# 2. ESLint
pnpm lint && echo "✅ ESLint OK" || echo "❌ ESLint FAILED"

# 3. Prettier
pnpm format && echo "✅ Prettier OK" || echo "❌ Prettier FAILED"

# 4. Tests
pnpm test && echo "✅ Tests OK" || echo "❌ Tests FAILED"

# 5. Build
pnpm build && echo "✅ Build OK" || echo "❌ Build FAILED"
```

If ANY verification fails, Agent must debug and fix before proceeding.

---

## Example: Complete Auto-Setup Session

```
Agent is ready to commit changes...

🔍 Phase 0: Detecting mandatory check tools...
├─ ❌ TypeScript: tsconfig.json not found
├─ ❌ ESLint: No configuration found
├─ ✅ Prettier: .prettierrc exists
├─ ❌ Tests: No test framework detected
└─ ✅ Build: tsup.config.ts exists

🔧 Auto-setup: Installing missing tools...
📦 Running: pnpm add -D typescript @types/node @eslint/js typescript-eslint vitest @vitest/coverage-v8

✓ Dependencies installed (4.2s)

📝 Creating configuration files...
├─ ✓ Created tsconfig.json
├─ ✓ Created eslint.config.mjs
├─ ✓ Created .eslintignore
├─ ✓ Created vitest.config.ts
└─ ✓ Created src/example.test.ts

✏️  Updating package.json scripts...
├─ ✓ Added: typecheck
├─ ✓ Added: lint
├─ ✓ Added: lint:fix
├─ ✓ Added: test
└─ ✓ Added: test:watch

🔍 Verifying setup...
├─ ✅ TypeScript: No errors
├─ ✅ ESLint: No errors
├─ ✅ Prettier: Already working
├─ ✅ Tests: 1 test passing
└─ ✅ Build: Already working

📝 Committing setup changes...
✓ Committed: chore(setup): configure mandatory pre-commit check tools

🎉 All mandatory check tools are now configured!

📋 Proceeding with standard pre-commit workflow...
```

---

## Benefits

### For Agent

- **Full autonomy**: No permission needed, just configure
- **Consistency**: Same standards across all projects
- **Efficiency**: One-time setup, then checks just work
- **No blockers**: Never stopped by missing tools

### For Developers

- **Zero friction**: No manual configuration required
- **Best practices**: Industry-standard configs automatically
- **Immediate productivity**: Start coding with quality checks in place
- **Learning**: See proper configurations as examples

### For Projects

- **Quality baseline**: All projects meet minimum standards
- **Maintainability**: Consistent tooling across codebase
- **Collaboration**: Familiar setups for new contributors
- **CI/CD ready**: Pre-commit checks match CI pipeline

---

## Integration Points

This auto-setup integrates with:

- **[Pre-Commit Workflow](./PRE_COMMIT_WORKFLOW.md)**: Phase 0 before checks
- **[Quality Commitment](./QUALITY_COMMITMENT.md)**: Enables quality guarantee
- **[Agent Instructions](../templates/AGENT_EDITING_INSTRUCTIONS.md)**: Part of agent workflow
- **GitHub Actions**: Ensures local and CI checks match

---

## Related Documentation

- [Pre-Commit Workflow](./PRE_COMMIT_WORKFLOW.md) - Main workflow documentation
- [Quality Commitment](./QUALITY_COMMITMENT.md) - Service commitment details
- [Quick Reference](./PRE_COMMIT_QUICK_REF.md) - Quick reference card
- [Agent Editing Instructions](../templates/AGENT_EDITING_INSTRUCTIONS.md) - Complete agent guidelines

---

**Remember**: Agent doesn't ask—Agent configures. Quality is non-negotiable. 🔒
