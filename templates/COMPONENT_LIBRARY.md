# Component/Module Library

> **Purpose**: This document is the **single source of truth** for all reusable components and modules in {{projectName}}. Before creating or modifying any reusable element, consult this guide.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Directory Structure](#directory-structure)
3. [Design Tokens/Constants](#design-tokensconstants)
4. [Component/Module Catalog](#componentmodule-catalog)
5. [Decision Tree](#decision-tree)
6. [Creating New Components/Modules](#creating-new-componentsmodules)
7. [Documentation Requirements](#documentation-requirements)

---

## Design Principles

1. **Reusability First**: Build components/modules that can be reused across the application
2. **Single Responsibility**: Each component/module should do one thing well
3. **Composability**: Smaller pieces that combine into larger features
4. **Consistency**: Use design tokens and follow established patterns
5. **Accessibility**: Consider accessibility from the start (if applicable to UI)

---

## Directory Structure

<!-- PROJECT-SPECIFIC: Define your component/module structure -->

```
src/
├── components/           # UI components (if applicable)
│   ├── ui/               # Base UI primitives
│   │   ├── button/
│   │   │   ├── index.ts
│   │   │   ├── button.tsx
│   │   │   └── button.test.ts
│   │   └── input/
│   ├── features/         # Feature-specific components
│   │   ├── auth/
│   │   └── dashboard/
│   └── layout/           # Layout components
│       ├── header/
│       └── sidebar/
├── lib/                  # Shared modules
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom hooks (if applicable)
│   └── services/         # Business logic services
└── types/                # Shared types
```

---

## Design Tokens/Constants

All design constants are centralized. **Never hardcode values.**

<!-- PROJECT-SPECIFIC: Define your design tokens location -->

| Category    | Location                           | Purpose                |
| ----------- | ---------------------------------- | ---------------------- |
| Colors      | `lib/design-tokens/colors.ts`      | Color palette          |
| Spacing     | `lib/design-tokens/spacing.ts`     | Margin, padding values |
| Typography  | `lib/design-tokens/typography.ts`  | Font sizes, weights    |
| Breakpoints | `lib/design-tokens/breakpoints.ts` | Responsive breakpoints |

**Usage Pattern:**

```typescript
// ❌ WRONG - Hardcoded values
const buttonStyle = { padding: "8px 16px", color: "#3b82f6" };

// ✅ CORRECT - Use design tokens
import { spacing, colors } from "@/lib/design-tokens";
const buttonStyle = { padding: spacing.md, color: colors.primary };
```

---

## Component/Module Catalog

### Quick Reference

<!-- PROJECT-SPECIFIC: List your reusable components/modules -->

| Need            | Component/Module | Location                       |
| --------------- | ---------------- | ------------------------------ |
| Button          | `Button`         | `components/ui/button`         |
| Input field     | `Input`          | `components/ui/input`          |
| Form wrapper    | `Form`           | `components/ui/form`           |
| Modal/Dialog    | `Dialog`         | `components/ui/dialog`         |
| Loading state   | `Spinner`        | `components/ui/spinner`        |
| Error display   | `ErrorBoundary`  | `components/ui/error-boundary` |
| Date formatting | `formatDate`     | `lib/utils/date`               |
| API requests    | `apiClient`      | `lib/api/client`               |

### Component Documentation Template

For each component/module, document:

```markdown
### ComponentName

**Location:** `components/ui/component-name`

**Purpose:** Brief description of what it does

**Props/Parameters:**

| Prop  | Type    | Default | Description |
| ----- | ------- | ------- | ----------- |
| prop1 | string  | -       | Description |
| prop2 | boolean | false   | Description |

**Usage:**

\`\`\`typescript
import { ComponentName } from "@/components/ui/component-name";

<ComponentName prop1="value" />
\`\`\`

**Variants:**

- `default` - Standard appearance
- `primary` - Primary action style
- `destructive` - Destructive action style
```

---

## Decision Tree

```
Need to create reusable code?
│
├─► Does a component/module already exist?
│   ├─► YES: Use it with existing options
│   │   └─► Need different behavior?
│   │       ├─► Can be achieved with params? → Use params
│   │       └─► Cannot? → Extend with new variant
│   │
│   └─► NO: Check for similar patterns
│       ├─► Similar pattern exists? → Follow that pattern
│       └─► New pattern needed?
│           │
│           ├─► Is it truly reusable (3+ uses)?
│           │   └─► YES: Create new with:
│           │         • Documentation
│           │         • Tests
│           │         • Examples
│           │
│           └─► One-off usage? → Implement inline
│               └─► Document why in PR
```

---

## Creating New Components/Modules

### Pre-Work Checklist

Before creating anything new:

- [ ] Searched this document for existing solutions
- [ ] Checked codebase for similar implementations
- [ ] Verified no library already provides this
- [ ] Confirmed it will be reused (3+ times)

### New Component/Module Requirements

Every new reusable component/module MUST have:

- [ ] **Clear interface** - Well-defined props/parameters with types
- [ ] **Documentation** - Added to this document
- [ ] **Unit tests** - Test all variants and edge cases
- [ ] **Error handling** - Graceful handling of invalid inputs
- [ ] **Accessibility** - Keyboard navigation, ARIA labels (if UI)

### File Structure

```
component-name/
├── index.ts              # Public exports
├── component-name.tsx    # Main implementation
├── component-name.test.ts # Tests
├── types.ts              # Types (if complex)
└── README.md             # Usage documentation (optional)
```

### Implementation Pattern

```typescript
// component-name/types.ts
export interface ComponentNameProps {
  /** Description of prop */
  variant?: "default" | "primary" | "secondary";
  /** Description of prop */
  disabled?: boolean;
  /** Children elements */
  children: React.ReactNode;
}

// component-name/component-name.tsx
import { ComponentNameProps } from "./types";

export function ComponentName({
  variant = "default",
  disabled = false,
  children,
}: ComponentNameProps) {
  // Implementation
}

// component-name/index.ts
export { ComponentName } from "./component-name";
export type { ComponentNameProps } from "./types";
```

---

## Documentation Requirements

### Minimum Documentation

Every component/module must have:

1. **JSDoc comments** on the main export
2. **Type definitions** for all props/parameters
3. **Entry in this document** with usage example

### JSDoc Example

````typescript
/**
 * A reusable button component with multiple variants.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click Me
 * </Button>
 * ```
 */
export function Button({ variant, children, ...props }: ButtonProps) {
  // ...
}
````

---

## Deprecating Components/Modules

When deprecating:

1. Add `@deprecated` JSDoc tag with migration path
2. Update this document to mark as deprecated
3. Add console warning in development
4. Remove after 2 major versions

```typescript
/**
 * @deprecated Use `NewComponent` instead. Will be removed in v3.0.
 */
export function OldComponent() {
  if (process.env.NODE_ENV === "development") {
    console.warn("OldComponent is deprecated. Use NewComponent instead.");
  }
  // ...
}
```

---

## Related Documents

- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Canonical locations
- [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md) - Approved libraries
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing requirements
