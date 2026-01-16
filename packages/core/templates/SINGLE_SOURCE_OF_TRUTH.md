# Single Source of Truth

> **Purpose**: This document defines the canonical locations for all imperative services, utilities, and architectural patterns in the codebase. When making changes, always reference the correct source files to maintain consistency.

---

## Table of Contents

1. [Supabase Clients](#supabase-clients)
2. [Authorization](#authorization)
3. [Types & Schemas](#types--schemas)
4. [Context Providers](#context-providers)
5. [Server Actions](#server-actions)
6. [Hooks](#hooks)
7. [Components](#components)
8. [Testing Infrastructure](#testing-infrastructure)
9. [Configuration](#configuration)

---

## Supabase Clients

All Supabase client creation MUST go through these files. Never create clients directly.

| File                         | Purpose                       | Usage Context                          |
| ---------------------------- | ----------------------------- | -------------------------------------- |
| `lib/supabase/client.ts`     | Browser client (singleton)    | Client components, hooks               |
| `lib/supabase/server.ts`     | Server client (async cookies) | Server components, server actions      |
| `lib/supabase/admin.ts`      | Admin client (bypasses RLS)   | Server actions needing elevated access |
| `lib/supabase/middleware.ts` | Session refresh               | `middleware.ts` only                   |

### Usage Patterns

```typescript
// ❌ WRONG - Never create clients directly
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);

// ✅ CORRECT - Use the appropriate helper
// In client components:
import { getSupabaseClient } from "@/lib/supabase/client";
const supabase = getSupabaseClient();

// In server actions/components:
import { createServerClient } from "@/lib/supabase/server";
const supabase = await createServerClient();

// For admin operations (bypasses RLS):
import { createAdminClient } from "@/lib/supabase/admin";
const supabase = createAdminClient();
```

---

## Authorization

Authorization logic is centralized in these files. Never implement permission checks inline.

| File                            | Purpose                                   | Usage Context     |
| ------------------------------- | ----------------------------------------- | ----------------- |
| `utils/authorization.ts`        | Role constants, hierarchy, client helpers | Client components |
| `utils/authorization.server.ts` | Server-side verification functions        | Server actions    |
| `hooks/useAuthorization.tsx`    | React hook for permission checks          | Client components |

### Role Constants (from `utils/authorization.ts`)

```typescript
// Role types
export type OrgRole =
  | "super_admin"
  | "owner"
  | "admin"
  | "manager"
  | "developer"
  | "viewer";

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: OrgRole[] = [
  "viewer",
  "developer",
  "manager",
  "admin",
  "owner",
  "super_admin",
];

// Role groups for permission checks
export const ADMIN_ROLES: OrgRole[] = ["super_admin", "owner", "admin"];
export const PRIVILEGED_ROLES: OrgRole[] = [
  "super_admin",
  "owner",
  "admin",
  "manager",
];
export const CONTRIBUTOR_ROLES: OrgRole[] = [
  "super_admin",
  "owner",
  "admin",
  "manager",
  "developer",
];
```

### Server-Side Authorization (from `utils/authorization.server.ts`)

```typescript
import {
  verifyBoardAccess,
  verifyTaskAccess,
  verifyWorkspaceAccess,
  requireAdminAccess,
  requirePrivilegedAccess,
  requireContributorAccess,
} from "@/utils/authorization.server";

// In server actions - always verify access FIRST
export async function getTask(taskId: string) {
  const access = await verifyTaskAccess(taskId);
  if (!access.hasAccess) {
    return { data: null, error: access.error || "Access denied" };
  }
  // ... proceed with data access
}

// For role-restricted operations
export async function deleteBoard(boardId: string) {
  const { profile } = await requireAdminAccess(); // Throws if not admin
  // ... proceed with deletion
}
```

### Client-Side Authorization (using `useAuthorization` hook)

```typescript
import { useAuthorization } from "@/hooks/useAuthorization";

function TaskActions({ task }) {
  const { can, currentUserRole, isRestricted } = useAuthorization();

  return (
    <>
      {can.editTask() && <Button onClick={handleEdit}>Edit</Button>}
      {can.deleteTask() && <Button onClick={handleDelete}>Delete</Button>}
      {can.manageUsers() && <Button onClick={handleManage}>Manage</Button>}
    </>
  );
}
```

---

## Types & Schemas

### Type Definitions

| File                | Contents                        | When to Update                            |
| ------------------- | ------------------------------- | ----------------------------------------- |
| `types/index.ts`    | Application types (camelCase)   | Adding new entities, changing data shapes |
| `types/supabase.ts` | Database types (auto-generated) | After running `pnpm supabase:gen`         |

### Key Types in `types/index.ts`

```typescript
// Entity types
export interface Task { id: string; title: string; ticketId: string; ... }
export interface Board { id: string; name: string; columns: Column[]; ... }
export interface Sprint { id: string; name: string; startDate: string; ... }
export interface Epic { id: string; title: string; color: string; ... }
export interface Organization { id: string; name: string; slug: string; ... }
export interface Team { id: string; name: string; members?: TeamMember[]; ... }
export interface Project { id: string; name: string; prefix: string; ... }

// Role types
export type UserRole = "super_admin" | "owner" | "admin" | "manager" | "developer" | "viewer";
export type OrgRole = UserRole;
export type TeamRole = "admin" | "member" | "viewer";

// Status/Priority enums
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked" | "cancelled";
export type Priority = "low" | "medium" | "high" | "critical";
export type TaskType = "story" | "task" | "bug" | "epic";
```

### Zod Schemas

| Location                      | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `lib/validations/*.schema.ts` | Validation schemas with type inference |
| `lib/validations/index.ts`    | Central export of all schemas          |

```typescript
// lib/validations/task.schema.ts
import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().regex(/^[A-Z]{1,6}-\d{4}$/),
  title: z.string().min(1).max(255),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

export type Task = z.infer<typeof TaskSchema>;

// lib/validations/index.ts
export { TaskSchema, type Task } from "./task.schema";
```

---

## Context Providers

### Current Structure (Monolithic)

Currently, all providers are in `app/providers.tsx` (2500+ lines). This file exports:

| Context                | Hook                 | Purpose                           |
| ---------------------- | -------------------- | --------------------------------- |
| `AuthContext`          | `useAuth()`          | User authentication state         |
| `OrganizationContext`  | `useOrganization()`  | Current org, members, permissions |
| `NotificationsContext` | `useNotifications()` | Notification state and actions    |
| `TeamsContext`         | `useTeams()`         | Team membership and management    |
| `PreferencesContext`   | `usePreferences()`   | User preferences                  |
| `ImpersonationContext` | `useImpersonation()` | Super admin impersonation         |
| `ProjectsContext`      | `useProjects()`      | Project management                |

### Target Structure (Modular)

The providers should be refactored into `app/providers/`:

```
app/providers/
├── index.tsx                 # Composite provider (exports Providers)
├── AuthProvider.tsx          # Authentication context
├── OrganizationProvider.tsx  # Organization context
├── NotificationProvider.tsx  # Notifications context
├── PreferencesProvider.tsx   # User preferences context
├── TeamsProvider.tsx         # Teams context
├── ImpersonationProvider.tsx # Impersonation context
├── ProjectsProvider.tsx      # Projects context
└── types.ts                  # Shared provider types
```

### Usage Pattern

```typescript
// Always import hooks from the providers module
import { useAuth, useOrganization, useNotifications } from "@/app/providers";

function MyComponent() {
  const { user, loading } = useAuth();
  const { organization, canManageUsers } = useOrganization();
  const { notifications, markAsRead } = useNotifications();
  // ...
}
```

---

## Server Actions

All server actions live in `app/actions/` with a central export.

| File                            | Purpose                       |
| ------------------------------- | ----------------------------- |
| `app/actions/index.ts`          | Central export of all actions |
| `app/actions/tasks.ts`          | Task CRUD operations          |
| `app/actions/boards.ts`         | Board management              |
| `app/actions/sprints.ts`        | Sprint management             |
| `app/actions/epics.ts`          | Epic management               |
| `app/actions/comments.ts`       | Comment operations            |
| `app/actions/organizations.ts`  | Organization management       |
| `app/actions/teams.ts`          | Team operations               |
| `app/actions/projects.ts`       | Project management            |
| `app/actions/projectMembers.ts` | Project membership            |
| `app/actions/notifications.ts`  | Notification operations       |
| `app/actions/invites.ts`        | Invite system                 |
| `app/actions/profile.ts`        | User profile operations       |
| `app/actions/impersonation.ts`  | Super admin impersonation     |
| `app/actions/userManagement.ts` | User administration           |

### Action Pattern

Every action file MUST:

1. Start with `'use server'` directive
2. Verify authorization before data access
3. Return `{ data, error }` or `{ success, error }` pattern
4. Transform snake_case DB fields to camelCase

```typescript
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { verifyBoardAccess } from "@/utils/authorization.server";
import { revalidatePath } from "next/cache";

export async function getTasks(boardId: string) {
  const access = await verifyBoardAccess(boardId);
  if (!access.hasAccess) {
    return { data: null, error: access.error };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId);

  if (error) return { data: null, error: error.message };

  return { data: data.map(transformTask), error: null };
}
```

---

## Hooks

Custom React hooks live in `hooks/`.

| Hook               | Purpose                          | File                         |
| ------------------ | -------------------------------- | ---------------------------- |
| `useAuthorization` | Permission checking              | `hooks/useAuthorization.tsx` |
| `useTheme`         | Color theme management           | `hooks/useTheme.tsx`         |
| `useRealtime`      | Supabase real-time subscriptions | `hooks/useRealtime.tsx`      |
| `useMediaQuery`    | Responsive breakpoints           | `hooks/useMediaQuery.tsx`    |
| `useMobile`        | Mobile device detection          | `hooks/useMobile.tsx`        |
| `useDebounce`      | Debounced values                 | `hooks/useDebounce.tsx`      |
| `useLocalStorage`  | Persistent local state           | `hooks/useLocalStorage.tsx`  |

### Hook Pattern

```typescript
import { useState, useEffect, useCallback } from "react";

export function useHookName(param: string) {
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Effect logic
  }, [param]);

  const action = useCallback(() => {
    // Action logic
  }, []);

  return { data, loading, error, action };
}
```

---

## Components

> **📚 Canonical Reference**: See `guidelines/COMPONENT_LIBRARY.md` for complete component documentation, usage patterns, and decision tree.

### Component Library Resources

| Resource                | Location                          | Purpose                                                   |
| ----------------------- | --------------------------------- | --------------------------------------------------------- |
| Component Library Guide | `guidelines/COMPONENT_LIBRARY.md` | Full component inventory, usage patterns, audit checklist |
| Design Tokens           | `lib/design-tokens.ts`            | Centralized colors, sizes, gradients                      |
| Feature Flags           | `lib/feature-flags.ts`            | Component rollout control                                 |
| Storybook               | `pnpm storybook` (localhost:6006) | Visual component documentation                            |

### Directory Structure

| Directory                 | Purpose                           |
| ------------------------- | --------------------------------- |
| `components/`             | Feature components                |
| `components/ui/`          | Base UI components (shadcn)       |
| `components/auth/`        | Authentication-related components |
| `components/settings/`    | Settings page components          |
| `components/super-admin/` | Super admin panel components      |
| `components/skeletons/`   | Loading skeleton components       |
| `.storybook/`             | Storybook configuration           |

### Component Testing

| Pattern         | Location                          |
| --------------- | --------------------------------- |
| Component tests | `components/*.test.tsx`           |
| Snapshot tests  | `components/__snapshots__/*.snap` |
| Stories         | `components/*.stories.tsx`        |

### Key Components

| Component               | Purpose                               |
| ----------------------- | ------------------------------------- |
| `Dashboard.tsx`         | Main dashboard layout                 |
| `DashboardApp.tsx`      | Dashboard application wrapper         |
| `Header.tsx`            | Top navigation header                 |
| `Sidebar.tsx`           | Navigation sidebar                    |
| `KanbanBoardView.tsx`   | Kanban board display                  |
| `TableView.tsx`         | Table view for tasks                  |
| `TaskCard.tsx`          | Task card component                   |
| `TaskDialog.tsx`        | Task creation/editing dialog          |
| `TaskDetailPanel.tsx`   | Task detail side panel                |
| `SprintDialog.tsx`      | Sprint management dialog              |
| `BoardDialog.tsx`       | Board configuration                   |
| `CommentsSection.tsx`   | Task comments                         |
| `NotificationPanel.tsx` | Notifications dropdown                |
| `ErrorBoundary.tsx`     | Error boundary wrapper                |
| `PriorityBadge.tsx`     | Priority indicator badge              |
| `StatusBadge.tsx`       | Status indicator badge (feature flag) |

---

## Testing Infrastructure

### Unit Testing

| File/Directory             | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `vitest.config.ts`         | Vitest configuration (bail: 1 for fail-fast) |
| `test/setup.ts`            | Test setup (mocks, MSW)                      |
| `test/fixtures.tsx`        | Mock data factories                          |
| `lib/test-utils/`          | Test utilities                               |
| `lib/test-utils/handlers/` | MSW API handlers                             |
| `lib/test-utils/db.ts`     | Mock database                                |

### Component Testing

| File/Directory              | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `components/*.test.tsx`     | Component unit tests                         |
| `components/__snapshots__/` | Snapshot test files                          |
| `lib/*.test.ts`             | Utility tests (design tokens, feature flags) |

### E2E Testing

| File/Directory               | Purpose                  |
| ---------------------------- | ------------------------ |
| `playwright.config.ts`       | Playwright configuration |
| `e2e/`                       | E2E test files           |
| `e2e/critical-tests.spec.ts` | Critical path tests      |
| `e2e/impersonation.spec.ts`  | Impersonation flow tests |

---

## Configuration

### Application Config

| File             | Purpose                           |
| ---------------- | --------------------------------- |
| `next.config.ts` | Next.js configuration             |
| `middleware.ts`  | Route middleware (auth redirects) |
| `tsconfig.json`  | TypeScript configuration          |
| `vercel.json`    | Vercel deployment config          |

### Styling Config

| File                 | Purpose                         |
| -------------------- | ------------------------------- |
| `postcss.config.mjs` | PostCSS/Tailwind config         |
| `app/globals.css`    | Global CSS variables and styles |

### Database

| Directory              | Purpose               |
| ---------------------- | --------------------- |
| `supabase/migrations/` | SQL migration files   |
| `supabase/config.toml` | Supabase local config |

---

## Quick Reference: Import Paths

```typescript
// Supabase clients
import { getSupabaseClient } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Authorization
import { ROLE_HIERARCHY, ADMIN_ROLES } from "@/utils/authorization";
import {
  verifyBoardAccess,
  requireAdminAccess,
} from "@/utils/authorization.server";
import { useAuthorization } from "@/hooks/useAuthorization";

// Types
import type { Task, Board, Sprint, Organization } from "@/types";
import type { Database } from "@/types/supabase";

// Providers/Context
import { useAuth, useOrganization, useTeams } from "@/app/providers";

// UI Components
import { Button, Input, Dialog } from "@/components/ui";

// Schemas
import { TaskSchema, CreateTaskSchema } from "@/lib/validations";

// Test utilities
import { mockTasks, createMockTask, seedTasks } from "@test/fixtures";
```

---

## Related Documents

- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Editing rules and patterns
- [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md) - Approved dependencies
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing patterns
