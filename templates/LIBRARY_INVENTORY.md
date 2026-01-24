# Library Inventory

> **Purpose**: This document serves as the single source of truth for all dependencies in {{projectName}}. Check this document before suggesting any new library and update it when new libraries are approved.

---

## Table of Contents

1. [Core Stack](#core-stack)
2. [Data Layer](#data-layer)
3. [UI/Interface](#uiinterface)
4. [Testing](#testing)
5. [Utilities](#utilities)
6. [Adding New Libraries](#adding-new-libraries)

---

## Core Stack

<!-- PROJECT-SPECIFIC: Define your core framework/runtime -->

### Framework/Runtime

| Property      | Value                    |
| ------------- | ------------------------ |
| Package       | `[package-name]`         |
| Version       | `[version]`              |
| Purpose       | Core application runtime |
| Documentation | [Link to docs]           |

**Usage Patterns:**

<!-- Document your project-specific patterns here -->

### Language

| Property | Value                           |
| -------- | ------------------------------- |
| Language | TypeScript / JavaScript / Other |
| Version  | `[version]`                     |
| Config   | `tsconfig.json` / equivalent    |

**Standards:**

- Strict type checking enabled
- Consistent code style via linter
- Path aliases configured (e.g., `@/` for src)

---

## Data Layer

<!-- PROJECT-SPECIFIC: Define your data layer -->

### Database/ORM

| Property      | Value                     |
| ------------- | ------------------------- |
| Package       | `[package-name]`          |
| Version       | `[version]`               |
| Purpose       | Data persistence, queries |
| Documentation | [Link to docs]            |

**Usage:**

- All database access through centralized client
- Migrations managed via [migration tool]
- Type-safe queries where possible

### State Management (if applicable)

| Property      | Value             |
| ------------- | ----------------- |
| Package       | `[package-name]`  |
| Version       | `[version]`       |
| Purpose       | Application state |
| Documentation | [Link to docs]    |

### API Client (if applicable)

| Property      | Value                  |
| ------------- | ---------------------- |
| Package       | `[package-name]`       |
| Version       | `[version]`            |
| Purpose       | HTTP requests, caching |
| Documentation | [Link to docs]         |

---

## UI/Interface

<!-- PROJECT-SPECIFIC: Define your UI libraries (if applicable) -->

### UI Framework/Library

| Property      | Value            |
| ------------- | ---------------- |
| Package       | `[package-name]` |
| Version       | `[version]`      |
| Purpose       | UI components    |
| Documentation | [Link to docs]   |

### Styling

| Property      | Value                |
| ------------- | -------------------- |
| Package       | `[package-name]`     |
| Version       | `[version]`          |
| Purpose       | CSS/styling solution |
| Documentation | [Link to docs]       |

### Form Handling (if applicable)

| Property      | Value                  |
| ------------- | ---------------------- |
| Package       | `[package-name]`       |
| Version       | `[version]`            |
| Purpose       | Form state, validation |
| Documentation | [Link to docs]         |

---

## Testing

### Test Runner

| Property      | Value                    |
| ------------- | ------------------------ |
| Package       | `[package-name]`         |
| Version       | `[version]`              |
| Purpose       | Unit & integration tests |
| Documentation | [Link to docs]           |

### E2E Testing (if applicable)

| Property      | Value            |
| ------------- | ---------------- |
| Package       | `[package-name]` |
| Version       | `[version]`      |
| Purpose       | End-to-end tests |
| Documentation | [Link to docs]   |

### Mocking

| Property      | Value            |
| ------------- | ---------------- |
| Package       | `[package-name]` |
| Version       | `[version]`      |
| Purpose       | Test mocking     |
| Documentation | [Link to docs]   |

---

## Utilities

### Validation

| Property      | Value                 |
| ------------- | --------------------- |
| Package       | `zod` / `joi` / other |
| Version       | `[version]`           |
| Purpose       | Schema validation     |
| Documentation | [Link to docs]        |

### Date/Time (if applicable)

| Property      | Value             |
| ------------- | ----------------- |
| Package       | `[package-name]`  |
| Version       | `[version]`       |
| Purpose       | Date manipulation |
| Documentation | [Link to docs]    |

### Logging

| Property      | Value               |
| ------------- | ------------------- |
| Package       | `[package-name]`    |
| Version       | `[version]`         |
| Purpose       | Application logging |
| Documentation | [Link to docs]      |

---

## Adding New Libraries

### Decision Criteria

Before adding a new library, consider:

1. **Is it already covered?** Check this document first
2. **Is it actively maintained?** Check GitHub activity, npm downloads
3. **Bundle size impact?** Consider tree-shaking, alternatives
4. **Security?** Check for known vulnerabilities
5. **License compatibility?** Ensure license is compatible

### Process

1. **Check this document first** - Ensure the functionality isn't already covered
2. **Propose the library** - Explain why it's needed and alternatives considered
3. **Get approval** - Do not add without explicit approval
4. **Install** - Add to dependency file with appropriate version
5. **Document** - Add entry to this file following the format above

### Library Entry Template

When adding a new library, use this format:

```markdown
### [Library Name]

| Property      | Value              |
| ------------- | ------------------ |
| Package       | `package-name`     |
| Version       | `x.y.z`            |
| Purpose       | What it's used for |
| Documentation | [Link to docs]     |

**Usage:**

- When to use this library
- Key patterns/conventions
- Any gotchas or limitations
```

### Rejected Libraries

Document libraries that were considered but rejected:

| Library | Reason for Rejection | Alternative Used |
| ------- | -------------------- | ---------------- |
| [name]  | [reason]             | [alternative]    |

---

## Related Documents

- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Canonical code locations
- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Coding standards
