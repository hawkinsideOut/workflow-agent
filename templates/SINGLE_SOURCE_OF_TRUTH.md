# Single Source of Truth

> **Purpose**: This document defines the canonical locations for all imperative services, utilities, and architectural patterns in {{projectName}}. Before creating any new file, check here first.

---

## Table of Contents

1. [Data Access Layer](#data-access-layer)
2. [Authorization](#authorization)
3. [Types & Schemas](#types--schemas)
4. [Business Logic](#business-logic)
5. [Utilities](#utilities)
6. [Configuration](#configuration)

---

## Core Principle

> **NEVER duplicate functionality.** If something exists, use it. If it doesn't exist and should be reusable, create it in the canonical location.

---

## Data Access Layer

All database/API access MUST go through designated modules. Never create clients directly.

<!-- PROJECT-SPECIFIC: Define your data access patterns -->

### Database Client

| Location          | Purpose                   | Usage Context               |
| ----------------- | ------------------------- | --------------------------- |
| `lib/db/client`   | Database client singleton | All database operations     |
| `lib/db/queries/` | Reusable query functions  | Common data access patterns |

**Usage Pattern:**

```typescript
// ❌ WRONG - Never create clients directly
const db = new DatabaseClient(process.env.DATABASE_URL);

// ✅ CORRECT - Use the centralized client
import { db } from "@/lib/db/client";
const users = await db.query("SELECT * FROM users");
```

### External API Clients

| Location               | Purpose                  | Usage Context            |
| ---------------------- | ------------------------ | ------------------------ |
| `lib/api/[service].ts` | External service clients | Third-party integrations |

---

## Authorization

Authorization logic is centralized. Never implement permission checks inline.

<!-- PROJECT-SPECIFIC: Define your authorization patterns -->

### Authorization Utilities

| Location                  | Purpose                           | Usage Context       |
| ------------------------- | --------------------------------- | ------------------- |
| `lib/auth/index.ts`       | Auth helpers, session management  | All auth operations |
| `lib/auth/permissions.ts` | Permission constants, role checks | Access control      |

**Usage Pattern:**

```typescript
// ❌ WRONG - Inline permission checks
if (user.role === "admin" || user.role === "owner") {
  // do something
}

// ✅ CORRECT - Use centralized authorization
import { canManageResource } from "@/lib/auth/permissions";
if (canManageResource(user, resource)) {
  // do something
}
```

### Role Constants

```typescript
// lib/auth/roles.ts
export const ROLES = {
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
```

---

## Types & Schemas

All shared types live in designated locations. Never define types inline for shared data structures.

<!-- PROJECT-SPECIFIC: Define your type locations -->

| Location            | Contents                       | When to Update       |
| ------------------- | ------------------------------ | -------------------- |
| `types/index.ts`    | Application types              | Adding new entities  |
| `types/api.ts`      | API request/response types     | API changes          |
| `types/database.ts` | Database types                 | After schema changes |
| `lib/validations/`  | Validation schemas (Zod, etc.) | Adding new inputs    |

**Usage Pattern:**

```typescript
// ❌ WRONG - Inline type definitions
function createUser(data: { name: string; email: string }) {}

// ✅ CORRECT - Import from types
import { CreateUserInput } from "@/types";
function createUser(data: CreateUserInput) {}
```

### Type Generation (if applicable)

If using database type generation:

```bash
# Regenerate types after schema changes
[type-generation-command]
```

---

## Business Logic

Core business logic lives in service modules, not in route handlers or UI components.

<!-- PROJECT-SPECIFIC: Define your service patterns -->

### Service Layer

| Location                   | Purpose                        |
| -------------------------- | ------------------------------ |
| `lib/services/[entity].ts` | Entity-specific business logic |
| `lib/services/[domain]/`   | Domain-grouped services        |

**Service Pattern:**

```typescript
// lib/services/users.ts
export async function createUser(
  input: CreateUserInput,
): Promise<Result<User>> {
  // 1. Validate input
  const validated = userSchema.parse(input);

  // 2. Business logic
  const hashedPassword = await hashPassword(validated.password);

  // 3. Data access
  const user = await db.users.create({
    ...validated,
    password: hashedPassword,
  });

  // 4. Return result
  return { data: user, error: null };
}
```

### Error Handling Pattern

Always return consistent error shapes:

```typescript
// ❌ WRONG - Throwing errors
throw new Error("User not found");

// ✅ CORRECT - Return error objects
return { data: null, error: "User not found" };
```

---

## Utilities

Utility functions are organized by category in the utils directory.

<!-- PROJECT-SPECIFIC: Define your utility locations -->

| Location                  | Purpose                 |
| ------------------------- | ----------------------- |
| `lib/utils/string.ts`     | String manipulation     |
| `lib/utils/date.ts`       | Date formatting/parsing |
| `lib/utils/validation.ts` | Validation helpers      |
| `lib/utils/formatting.ts` | Display formatting      |

**Before Creating a New Utility:**

1. Check if it already exists in `lib/utils/`
2. Check if a library already provides this functionality
3. If truly new, add to the appropriate category file

---

## Configuration

Application configuration is centralized.

<!-- PROJECT-SPECIFIC: Define your config locations -->

| Location              | Purpose                   |
| --------------------- | ------------------------- |
| `config/index.ts`     | Application configuration |
| `config/constants.ts` | Application constants     |
| `.env` / `.env.local` | Environment variables     |

**Usage Pattern:**

```typescript
// ❌ WRONG - Hardcoded values
const API_URL = "https://api.example.com";

// ✅ CORRECT - Use configuration
import { config } from "@/config";
const API_URL = config.apiUrl;
```

---

## Quick Reference: Where Does It Go?

| I need to create...     | Location                |
| ----------------------- | ----------------------- |
| Database query function | `lib/db/queries/`       |
| API route handler       | `app/api/` or `routes/` |
| Business logic          | `lib/services/`         |
| Shared type             | `types/`                |
| Validation schema       | `lib/validations/`      |
| Utility function        | `lib/utils/`            |
| Configuration           | `config/`               |
| Auth helper             | `lib/auth/`             |
| External API client     | `lib/api/`              |

---

## Adding New Canonical Locations

When adding a new canonical location:

1. Document it in this file
2. Create the directory/file with a README or comment
3. Update any related tooling (path aliases, etc.)
4. Announce to the team

---

## Related Documents

- [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md) - Approved libraries
- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Coding standards
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing patterns
