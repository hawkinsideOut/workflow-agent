# Custom Scope Package Template

This template provides boilerplate code for creating custom scope packages for the Workflow Agent.

## Package Structure

```
scopes-{{scopeName}}/
├── package.json       # Package metadata and dependencies
├── tsconfig.json      # TypeScript configuration
├── tsup.config.ts     # Build configuration
└── src/
    ├── index.ts       # Scope definitions and preset export
    └── index.test.ts  # Test suite for scopes
```

## package.json Template

```json
{
  "name": "@workflow/scopes-{{scopeName}}",
  "version": "{{packageVersion}}",
  "description": "Scope preset for {{presetName}}",
  "keywords": ["workflow", "scopes", "{{scopeName}}", "preset"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/your-repo.git",
    "directory": "{{packageDirectory}}"
  },
  "license": "MIT",
  "author": "Your Name",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "peerDependencies": {
    "@hawkinside_out/workflow-agent": "^1.0.0"
  },
  "devDependencies": {
    "@hawkinside_out/workflow-agent": "^1.0.0",
    "tsup": "^8.0.1",
    "typescript": "^5.3.3",
    "vitest": "^1.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## src/index.ts Template

```typescript
import type { Scope } from '@hawkinside_out/workflow-agent/config';

export const scopes: Scope[] = {{scopeDefinitions}};

export const preset = {
  name: '{{presetName}}',
  description: 'Scope configuration for {{presetName}}',
  scopes,
  version: '{{packageVersion}}',
};

export default preset;
```

## src/index.test.ts Template

```typescript
import { describe, it, expect } from 'vitest';
import { scopes, preset } from './index.js';
import { ScopeSchema } from '@hawkinside_out/workflow-agent/config';

describe('{{presetName}} Scope Preset', () => {
  it('should export valid scopes array', () => {
    expect(scopes).toBeDefined();
    expect(Array.isArray(scopes)).toBe(true);
    expect(scopes.length).toBeGreaterThan(0);
  });

  it('should have valid preset object', () => {
    expect(preset).toBeDefined();
    expect(preset.name).toBe('{{presetName}}');
    expect(preset.scopes).toBe(scopes);
    expect(preset.version).toBeDefined();
  });

  it('should have no duplicate scope names', () => {
    const names = scopes.map(s => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have all scopes match schema', () => {
    scopes.forEach(scope => {
      const result = ScopeSchema.safeParse(scope);
      if (!result.success) {
        console.error(\`Scope "\${scope.name}" failed validation:\`, result.error);
      }
      expect(result.success).toBe(true);
    });
  });

  it('should have descriptions for all scopes', () => {
    scopes.forEach(scope => {
      expect(scope.description).toBeDefined();
      expect(scope.description.length).toBeGreaterThan(0);
    });
  });
});
```

## tsconfig.json Template

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## tsup.config.ts Template

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

## Usage

To create a custom scope package using these templates:

1. **Use the CLI** (recommended):
   ```bash
   workflow scope:create
   ```

2. **Manual creation** (advanced):
   - Copy this template structure
   - Replace all `{{variable}}` placeholders
   - Run `pnpm install && pnpm build && pnpm test`

## Variables

- `{{scopeName}}` - Package name (lowercase, alphanumeric with hyphens)
- `{{presetName}}` - Display name for the preset
- `{{scopeDefinitions}}` - JSON array of scope objects
- `{{packageVersion}}` - Package version (default: "1.0.0")
- `{{packageDirectory}}` - Relative path in repository
- `{{isMonorepo}}` - "true" if in monorepo workspace

## Scope Object Schema

Each scope in `{{scopeDefinitions}}` must match:

```typescript
{
  name: string;              // lowercase, alphanumeric, hyphens, max 32 chars
  description: string;       // min 10 characters
  emoji?: string;            // optional emoji
  category?: 'auth' | 'features' | 'infrastructure' | 'documentation' | 
             'testing' | 'performance' | 'other';
}
```

## Example Scope Definitions

```json
[
  {
    "name": "auth",
    "description": "Authentication and authorization features",
    "emoji": "🔐",
    "category": "auth"
  },
  {
    "name": "billing",
    "description": "Payment processing and subscription management",
    "emoji": "💳",
    "category": "features"
  },
  {
    "name": "analytics",
    "description": "Usage tracking and reporting features",
    "emoji": "📊",
    "category": "features"
  }
]
```

## Best Practices

1. **Scope Count**: Aim for 8-15 scopes per preset
2. **Naming**: Use clear, domain-specific names (avoid generic terms like "feature", "fix")
3. **Descriptions**: Be specific about what each scope covers (minimum 10 characters)
4. **Categories**: Use categories to group related scopes
5. **Emojis**: Add visual identifiers to improve readability (optional)

## Next Steps

After creating your package:

1. Build: `pnpm build`
2. Test: `pnpm test`
3. Publish: `pnpm publish --access public`
4. Use: `pnpm add @workflow/scopes-{{scopeName}}`
