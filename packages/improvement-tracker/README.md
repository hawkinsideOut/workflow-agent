# @hawkinside_out/workflow-improvement-tracker

> Agent Learning System for capturing, sharing, and applying working code patterns

[![npm version](https://img.shields.io/npm/v/@hawkinside_out/workflow-improvement-tracker.svg)](https://www.npmjs.com/package/@hawkinside_out/workflow-improvement-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

The improvement-tracker package provides a comprehensive agent learning system that captures successful code patterns from your projects and makes them reusable across your entire development ecosystem.

## ✨ Features

### Pattern Capture
- 🧠 **Smart Analysis** - Automatically detects code structure, dependencies, and architecture
- 📁 **Multi-file Support** - Capture entire implementations with all related files
- 🔗 **Dependency Detection** - Identifies both production and development dependencies
- 🌐 **Environment Variables** - Captures required env vars with descriptions
- 🏗️ **Architecture Detection** - Recognizes patterns like request-response, middleware, etc.

### Pattern Management
- 🔍 **Semantic Search** - Find patterns by keywords, category, or intent
- 📊 **Usage Tracking** - Track how often patterns are applied
- ⭐ **Effectiveness Scores** - Measure pattern success rates
- ⏰ **Auto-deprecation** - Patterns unused for 1+ year are auto-deprecated
- 🔒 **Privacy-First** - PII automatically stripped before storage

### Integration
- 🎯 **CLI Commands** - Full CLI integration with `workflow solution:*`
- 💾 **File-based Storage** - Patterns stored in `.workflow/patterns/solutions/`
- 📦 **Schema Validation** - Zod-powered schemas ensure data integrity
- 🔄 **Pattern Versioning** - Track pattern evolution over time

---

## 📦 Installation

```bash
# Via pnpm (in monorepo)
pnpm add @hawkinside_out/workflow-improvement-tracker

# Via npm
npm install @hawkinside_out/workflow-improvement-tracker
```

---

## 🚀 CLI Usage

### Capture a Solution Pattern

Capture working code from your project:

```bash
# Interactive mode
workflow-agent solution:capture

# With options
workflow-agent solution:capture \
  --path ./src/auth \
  --name "JWT Authentication" \
  --category auth \
  --tags "jwt,authentication,security"
```

The analyzer will:
1. Scan all files in the specified path
2. Detect dependencies and dev dependencies
3. Identify environment variables
4. Analyze code architecture
5. Create a reusable pattern

### Search for Solutions

Find patterns that match your needs:

```bash
# Search by keyword
workflow-agent solution:search "authentication jwt"

# Search with category filter
workflow-agent solution:search "user login" --category auth

# Search with tag filter
workflow-agent solution:search "api" --tags "rest,middleware"
```

### List All Solutions

View your pattern library:

```bash
# List all patterns
workflow-agent solution:list

# Filter by category
workflow-agent solution:list --category auth

# Include deprecated patterns
workflow-agent solution:list --include-deprecated
```

### Apply a Solution

Apply a pattern to your current project:

```bash
# Apply by ID
workflow-agent solution:apply sol_abc123

# Apply without prompts
workflow-agent solution:apply sol_abc123 --yes

# Dry run (preview only)
workflow-agent solution:apply sol_abc123 --dry-run
```

### View Statistics

Get insights into your pattern library:

```bash
workflow-agent solution:stats
```

Shows:
- Total patterns by category
- Most used patterns
- Highest effectiveness scores
- Deprecated pattern count

### Deprecate a Solution

Mark an outdated pattern as deprecated:

```bash
workflow-agent solution:deprecate sol_abc123 "Replaced by OAuth2 implementation"
```

---

## 📚 Programmatic API

### CodeAnalyzer

Analyze files and directories to extract code patterns:

```typescript
import { createCodeAnalyzer } from '@hawkinside_out/workflow-improvement-tracker';

// Create analyzer instance
const analyzer = createCodeAnalyzer();

// Analyze a single file
const fileResult = await analyzer.analyzeFile('/path/to/auth.ts');
console.log(fileResult.language);      // 'typescript'
console.log(fileResult.imports);       // ['jsonwebtoken', 'express']
console.log(fileResult.exports);       // ['authenticateUser', 'generateToken']

// Analyze a directory
const dirResult = await analyzer.analyzeDirectory('/path/to/auth');
console.log(dirResult.files);          // Array of file analysis results
console.log(dirResult.entryPoints);    // ['index.ts']
console.log(dirResult.architecture);   // 'middleware'

// Create a solution pattern from analyzed code
const pattern = await analyzer.createSolutionPattern('/path/to/auth', {
  name: 'JWT Authentication',
  description: 'Complete JWT auth implementation with refresh tokens',
  category: 'auth',
  tags: ['jwt', 'authentication', 'security'],
  author: 'your-name'
});
```

### PatternStore

Store and retrieve solution patterns:

```typescript
import { PatternStore } from '@hawkinside_out/workflow-improvement-tracker';

// Create store instance
const store = new PatternStore('/path/to/project');

// Add a solution pattern
const result = await store.addSolutionPattern(pattern);
if (result.success) {
  console.log('Pattern saved:', result.data.id);
}

// Search for patterns
const searchResults = await store.searchSolutionPatterns({
  keywords: ['authentication'],
  category: 'auth',
  limit: 10
});

// Get pattern by ID
const patternResult = await store.getSolutionPatternById('sol_abc123');

// List all patterns
const allPatterns = await store.listSolutionPatterns();

// Record pattern usage
await store.recordSolutionUsage('sol_abc123', {
  projectContext: 'e-commerce-app',
  effectiveness: 0.95
});

// Get statistics
const stats = await store.getSolutionStats();
console.log(stats.data.totalPatterns);
console.log(stats.data.byCategory);
console.log(stats.data.mostUsed);
```

### Schema Validation

All patterns are validated using Zod schemas:

```typescript
import {
  SolutionPatternSchema,
  SolutionDependencySchema,
  SolutionCodeSnippetSchema,
  SolutionEnvironmentVarSchema,
  SolutionCategorySchema
} from '@hawkinside_out/workflow-improvement-tracker';

// Validate a pattern
const validatedPattern = SolutionPatternSchema.parse(rawData);

// Validate category
const category = SolutionCategorySchema.parse('auth'); // Valid
```

---

## 📐 Pattern Schema

A Solution Pattern contains:

```typescript
interface SolutionPattern {
  id: string;                           // Unique ID (sol_*)
  name: string;                         // Human-readable name
  description: string;                  // Detailed description
  category: SolutionCategory;           // auth, api, database, etc.
  tags: string[];                       // Searchable tags
  
  // Code content
  codeSnippets: SolutionCodeSnippet[];  // The actual code
  dependencies: SolutionDependency[];   // Required packages
  environmentVars: SolutionEnvVar[];    // Required env vars
  fileStructure?: string;               // Directory layout
  
  // Metadata
  author?: string;
  sourceProject?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Usage tracking
  usageCount: number;
  effectivenessScore: number;           // 0-1 based on feedback
  
  // Lifecycle
  deprecated: boolean;
  deprecatedAt?: Date;
  deprecationReason?: string;
}
```

### Categories

Available solution categories:
- `auth` - Authentication & authorization
- `api` - API design & endpoints
- `database` - Database schemas & queries
- `testing` - Test utilities & patterns
- `ui` - User interface components
- `devops` - CI/CD & infrastructure
- `performance` - Optimization patterns
- `security` - Security implementations
- `integrations` - Third-party integrations
- `utilities` - Helper functions & utilities
- `architecture` - Structural patterns
- `error-handling` - Error management
- `other` - Miscellaneous patterns

---

## 🔧 Configuration

Patterns are stored in your project's `.workflow/patterns/solutions/` directory:

```
.workflow/
└── patterns/
    └── solutions/
        ├── sol_abc123.json
        ├── sol_def456.json
        └── ...
```

Each pattern is stored as a separate JSON file for easy version control and sharing.

---

## 🧪 Testing

The package includes comprehensive tests:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
npx vitest run code-analyzer.test.ts
```

Test coverage includes:
- 53 tests for CodeAnalyzer
- 37 tests for PatternStore
- 45 tests for Schema validation
- 14 E2E tests for CLI commands

---

## 📊 Example Workflow

### 1. Complete a feature implementation

```bash
# You just finished implementing JWT auth in your project
ls src/auth/
# index.ts  jwt.service.ts  middleware.ts  types.ts
```

### 2. Capture the pattern

```bash
workflow-agent solution:capture \
  --path ./src/auth \
  --name "JWT Auth with Refresh Tokens" \
  --category auth \
  --tags "jwt,refresh-tokens,express"

# ✓ Captured 4 files
# ✓ Detected 3 dependencies: jsonwebtoken, express, bcrypt
# ✓ Found 2 env vars: JWT_SECRET, JWT_REFRESH_SECRET
# ✓ Pattern saved: sol_xyz789
```

### 3. Start a new project

```bash
mkdir new-project && cd new-project
workflow-agent init
```

### 4. Search for auth solution

```bash
workflow-agent solution:search "jwt authentication"

# Found 3 patterns:
# 1. JWT Auth with Refresh Tokens (auth) ⭐ 0.95
# 2. Basic JWT Auth (auth) ⭐ 0.88
# 3. OAuth2 + JWT Hybrid (auth) ⭐ 0.92
```

### 5. Apply the pattern

```bash
workflow-agent solution:apply sol_xyz789

# Preview:
# - Create src/auth/index.ts
# - Create src/auth/jwt.service.ts
# - Create src/auth/middleware.ts
# - Create src/auth/types.ts
# - Install: jsonwebtoken, express, bcrypt
# - Add env vars: JWT_SECRET, JWT_REFRESH_SECRET
#
# Apply pattern? (y/n) y
# ✓ Pattern applied successfully!
```

---

## 🤝 Contributing

Contributions are welcome! See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © [HawkinsideOut](https://github.com/hawkinsideOut)
