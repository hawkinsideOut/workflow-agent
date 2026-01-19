# Pattern Analysis Workflow

> **Purpose**: This document defines the step-by-step workflow that AI agents must follow when analyzing a codebase for patterns and updating the central pattern store. Following this workflow ensures consistent pattern capture, proper anonymization, and meaningful contribution to the ecosystem's shared knowledge.

---

## Table of Contents

1. [When to Perform Pattern Analysis](#when-to-perform-pattern-analysis)
2. [Phase 1: Discovery](#phase-1-discovery)
3. [Phase 2: Categorization](#phase-2-categorization)
4. [Phase 3: Pattern Extraction](#phase-3-pattern-extraction)
5. [Phase 4: Validation](#phase-4-validation)
6. [Phase 5: Store Update](#phase-5-store-update)
7. [Phase 6: Reporting](#phase-6-reporting)
8. [Pattern Quality Criteria](#pattern-quality-criteria)
9. [CLI Commands Reference](#cli-commands-reference)

---

## When to Perform Pattern Analysis

Initiate pattern analysis when:

| Trigger | Description |
|---------|-------------|
| **Post-fix success** | A quality issue was detected and auto-fixed successfully |
| **User request** | User explicitly asks to "analyze patterns" or "record what we learned" |
| **Project setup complete** | A new project was scaffolded and configured successfully |
| **Migration complete** | A framework upgrade or refactor was completed without issues |
| **CI/CD passing** | All quality checks pass after non-trivial changes |

---

## Phase 1: Discovery

### Objective
Identify candidate patterns worth capturing from the current work session.

### Steps

1. **Review Recent Changes**
   ```bash
   # Check what was modified
   git diff HEAD~5 --name-only
   
   # Review specific fix patterns
   git log --oneline -10 --grep="fix"
   ```

2. **Identify Pattern Candidates**
   Look for:
   - ✅ Fixes that resolved linting errors
   - ✅ Configuration changes that fixed build issues
   - ✅ Dependency resolutions
   - ✅ Type error fixes
   - ✅ Repeatable project setup steps
   - ✅ Framework-specific workarounds

3. **Check Existing Patterns**
   ```bash
   # List current patterns to avoid duplicates
   workflow learn:list --framework <current-framework>
   ```

4. **Document Candidates**
   Create a mental or written list of patterns worth capturing:
   ```
   Pattern Candidates:
   1. [lint] ESLint prefer-const auto-fix
   2. [type-error] Null assertion for optional chaining
   3. [config] Next.js 14 App Router image config
   ```

---

## Phase 2: Categorization

### Objective
Classify each pattern candidate into the appropriate type and category.

### Pattern Types

| Type | Use When | Example |
|------|----------|---------|
| **Fix Pattern** | Solves a specific, repeatable error | ESLint rule violation fix |
| **Blueprint** | Represents complete project/feature setup | Next.js 14 TypeScript starter |

### Fix Pattern Categories

Choose the most specific category:

| Category | Description | Examples |
|----------|-------------|----------|
| `lint` | Linting rule violations | ESLint, Prettier, Stylelint |
| `type-error` | TypeScript/type system errors | Missing types, inference issues |
| `dependency` | Package/module resolution | Missing deps, version conflicts |
| `config` | Configuration file issues | tsconfig, next.config, vite.config |
| `runtime` | Runtime errors | Null refs, async issues |
| `build` | Build/compilation failures | Bundler errors, missing exports |
| `test` | Test failures | Jest, Vitest, Playwright |
| `security` | Security vulnerabilities | Dependency audits, secrets |

### Tag Schema

Apply tags for discoverability:

```
framework:<name>     → framework:next, framework:react
tool:<name>          → tool:eslint, tool:prettier
error-type:<type>    → error-type:unused-import, error-type:missing-type
file-type:<ext>      → file-type:tsx, file-type:json
custom:<value>       → custom:app-router, custom:server-component
```

---

## Phase 3: Pattern Extraction

### Objective
Convert the identified fixes into structured pattern definitions.

### For Fix Patterns

Extract these components:

```typescript
{
  // IDENTIFICATION
  name: string,           // "ESLint prefer-const fix"
  description: string,    // "Replace let with const for variables that are never reassigned"
  category: string,       // "lint"
  
  // TRIGGER (when does this apply?)
  trigger: {
    errorPattern: string,   // Regex: "Prefer const over let"
    errorMessage: string,   // Example: "'x' is never reassigned"
    filePattern: string,    // Glob: "*.ts,*.tsx"
  },
  
  // SOLUTION (how to fix it)
  solution: {
    type: string,           // "file-change" | "command" | "config-update"
    steps: [{
      order: 1,
      action: string,       // "modify" | "run" | "install" | "create"
      target: string,       // File path or command
      description: string,  // Human-readable step
    }]
  },
  
  // COMPATIBILITY (where does this work?)
  compatibility: {
    framework: string,        // "next" | "react" | "vue" | ...
    frameworkVersion: string, // "^14.0.0"
    runtime: string,          // "node"
    runtimeVersion: string,   // ">=18.0.0"
  },
  
  // METADATA
  tags: [{ name: string, category: string }],
  source: "manual" | "auto-heal" | "verify-fix" | "imported",
  isPrivate: true,
}
```

### For Blueprints

Extract these components:

```typescript
{
  // IDENTIFICATION
  name: string,           // "Next.js 14 TypeScript Starter"
  description: string,    // "Complete setup with App Router, Tailwind, and testing"
  
  // STACK DEFINITION
  stack: {
    framework: string,      // "next"
    language: string,       // "typescript"
    runtime: string,        // "node"
    packageManager: string, // "pnpm"
    dependencies: [{ name: string, version: string }],
    devDependencies: [{ name: string, version: string }],
  },
  
  // PROJECT STRUCTURE
  structure: {
    directories: [{ path: string, purpose: string }],
    keyFiles: [{ path: string, purpose: string, template?: string }],
  },
  
  // SETUP STEPS
  setup: {
    prerequisites: string[],
    steps: [{ order: number, command: string, description: string }],
    configs: [{ file: string, content: string, description: string }],
  },
  
  // METADATA
  tags: [{ name: string, category: string }],
  relatedPatterns: string[],  // UUIDs of related fix patterns
  isPrivate: true,
}
```

---

## Phase 4: Validation

### Objective
Ensure patterns are high-quality before storing.

### Quality Checklist

Before recording any pattern, verify:

- [ ] **Reproducible**: Can this fix be applied to similar situations?
- [ ] **Specific**: Is the trigger pattern precise enough to avoid false matches?
- [ ] **Complete**: Are all solution steps documented?
- [ ] **Tested**: Did the fix actually work when applied?
- [ ] **Unique**: Does this not duplicate an existing pattern?
- [ ] **Anonymized**: No PII, absolute paths, or secrets in the pattern?

### Validation Commands

```bash
# Check for similar existing patterns
workflow learn:list --search "<error-message-fragment>"

# Preview what would be recorded
workflow learn:record --type fix --name "..." --dry-run
```

### Anonymization Rules

Ensure these are NOT in the pattern:

| Data Type | Example | Action |
|-----------|---------|--------|
| Absolute paths | `/home/user/project` | Remove or use `<PATH>` |
| Email addresses | `dev@company.com` | Remove entirely |
| API keys | `sk_live_...` | Never include |
| IP addresses | `192.168.1.100` | Remove or use `<IP>` |
| Repo-specific names | `my-company-app` | Generalize |

---

## Phase 5: Store Update

### Objective
Persist validated patterns to the central store.

### Recording Fix Patterns

```bash
workflow learn:record \
  --type fix \
  --name "ESLint prefer-const fix" \
  --description "Replace let with const for never-reassigned variables" \
  --category lint \
  --framework node \
  --tags "tool:eslint,error-type:prefer-const"
```

### Recording Blueprints

```bash
workflow learn:record \
  --type blueprint \
  --name "Next.js 14 App Router Starter" \
  --description "TypeScript project with Tailwind, ESLint, and Vitest" \
  --framework next \
  --version "^14.0.0" \
  --tags "framework:next,tool:tailwind,tool:vitest"
```

### Programmatic Recording

When automating pattern capture:

```typescript
import { PatternStore, type FixPattern } from "@hawkinside_out/workflow-improvement-tracker";

const store = new PatternStore(process.cwd());
await store.initialize();

const pattern: FixPattern = {
  id: crypto.randomUUID(),
  name: "ESLint prefer-const fix",
  description: "Replace let with const for never-reassigned variables",
  category: "lint",
  tags: [
    { name: "eslint", category: "tool" },
    { name: "prefer-const", category: "error-type" },
  ],
  trigger: {
    errorPattern: "Prefer const over let",
    filePattern: "*.ts,*.tsx",
  },
  solution: {
    type: "file-change",
    steps: [{
      order: 1,
      action: "modify",
      target: "<file>",
      description: "Change 'let' to 'const' for the flagged variable",
    }],
  },
  compatibility: {
    framework: "node",
    frameworkVersion: "*",
  },
  metrics: {
    successRate: 100,
    applications: 0,
    successes: 0,
    failures: 0,
  },
  source: "manual",
  isPrivate: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const result = await store.saveFixPattern(pattern);
if (result.success) {
  console.log(`✓ Pattern saved: ${result.data?.id}`);
}
```

### Updating Existing Patterns

When a pattern needs improvement:

```typescript
// Get existing pattern
const existing = await store.getFixPattern(patternId);

// Update with better trigger
existing.trigger.errorPattern = "more specific regex";
existing.updatedAt = new Date().toISOString();

// Save (handles version conflict automatically)
await store.saveFixPattern(existing);
```

---

## Phase 6: Reporting

### Objective
Communicate what patterns were captured and their status.

### Post-Analysis Report Template

After completing pattern analysis, report:

```markdown
## 📚 Pattern Analysis Complete

### Patterns Recorded
| Type | Name | Category | Status |
|------|------|----------|--------|
| Fix | ESLint prefer-const | lint | ✅ Saved |
| Fix | TS null assertion | type-error | ✅ Saved |
| Blueprint | Next.js 14 Starter | - | ⏭ Skipped (duplicate) |

### Store Statistics
- Total Fix Patterns: 45
- Total Blueprints: 7
- This Session: +2 fixes

### Next Steps
- Run `workflow learn:list` to view all patterns
- Run `workflow learn:sync --push` to share with community
```

### View Statistics

```bash
workflow learn:stats
```

---

## Pattern Quality Criteria

### Good Pattern Characteristics

| Criteria | Good Example | Bad Example |
|----------|--------------|-------------|
| **Specificity** | `errorPattern: "Cannot find module '@/.*'"` | `errorPattern: "error"` |
| **Reusability** | Works across similar projects | Only works in one specific repo |
| **Documentation** | Clear description with context | "Fixes the thing" |
| **Versioning** | `frameworkVersion: "^14.0.0"` | No version specified |

### Pattern Red Flags

Do NOT record patterns that:

- 🚫 Contain hardcoded project-specific paths
- 🚫 Reference internal/proprietary APIs
- 🚫 Include commented-out code
- 🚫 Have success rate below 50% (after 5+ uses)
- 🚫 Duplicate existing patterns with minor variations

---

## CLI Commands Reference

### Recording

```bash
# Record a fix pattern
workflow learn:record --type fix --name "..." --description "..." --category lint

# Record a blueprint
workflow learn:record --type blueprint --name "..." --description "..."

# Dry run (preview only)
workflow learn:record --type fix --name "..." --dry-run
```

### Viewing

```bash
# List all patterns
workflow learn:list

# Filter by type
workflow learn:list --type fix

# Filter by framework
workflow learn:list --framework next

# Include deprecated
workflow learn:list --deprecated

# Search patterns
workflow learn:list --search "eslint"
```

### Applying

```bash
# Apply a pattern
workflow learn:apply <pattern-id>

# Dry run
workflow learn:apply <pattern-id> --dry-run
```

### Managing

```bash
# View statistics
workflow learn:stats

# Deprecate a pattern
workflow learn:deprecate <pattern-id> --reason "Superseded by better solution"

# Configure sync settings
workflow learn:config --enable-sync
workflow learn:config --disable-telemetry
```

### Syncing

```bash
# Preview sync
workflow learn:sync --dry-run

# Push to community
workflow learn:sync --push

# Pull from community
workflow learn:sync --pull
```

---

## Quick Reference: Agent Workflow

When asked to analyze patterns:

```
1. DISCOVER    → Review recent changes, identify fixes worth capturing
2. CATEGORIZE  → Classify as fix/blueprint, assign category and tags
3. EXTRACT     → Build structured pattern with trigger + solution
4. VALIDATE    → Check quality, uniqueness, anonymization
5. STORE       → Use CLI or API to persist pattern
6. REPORT      → Summarize what was captured
```

### One-Liner for Auto-Recording

After successful verification with fixes:

```bash
workflow verify --fix --learn
```

This automatically:
1. Runs all quality checks
2. Applies auto-fixes
3. Re-validates
4. Records successful fixes as patterns

---

## Storage Locations

Patterns are stored in:

```
.workflow/
├── patterns/
│   ├── fixes/
│   │   ├── <uuid>.json    ← Fix patterns
│   │   └── ...
│   └── blueprints/
│       ├── <uuid>.json    ← Blueprints
│       └── ...
└── .contributor-id        ← Anonymous contributor ID
```

Each pattern file contains the full schema plus metadata for versioning and conflict resolution.

---

## Related Documents

- [Agent Editing Instructions](./AGENT_EDITING_INSTRUCTIONS.md) - General editing rules
- [Self-Improvement Mandate](./SELF_IMPROVEMENT_MANDATE.md) - Improvement tracking
- [Agent Learning System](/docs/content/agent-learning.mdx) - Full API documentation
