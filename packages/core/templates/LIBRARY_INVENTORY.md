# Library Inventory

> **Purpose**: This document serves as the single source of truth for all dependencies in the project. Agent must check this document before suggesting any new library and must update it when new libraries are approved.

---

## Table of Contents

1. [Core Framework](#core-framework)
2. [Backend & Data](#backend--data)
3. [UI Components](#ui-components)
4. [Forms & Validation](#forms--validation)
5. [Drag & Drop](#drag--drop)
6. [Rich Text Editing](#rich-text-editing)
7. [Styling & Animation](#styling--animation)
8. [Testing](#testing)
9. [Utilities](#utilities)
10. [Adding New Libraries](#adding-new-libraries)

---

## Core Framework

### Next.js

| Property      | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Package       | `next`                                                             |
| Version       | `^16.1.1`                                                          |
| Purpose       | React framework with App Router, server components, server actions |
| Documentation | https://nextjs.org/docs                                            |

**Usage Patterns:**

- App Router: All routes in `app/` directory
- Server Actions: `'use server'` directive in `app/actions/`
- Server Components: Default for pages, use `'use client'` for interactivity
- Middleware: `middleware.ts` for auth redirects

### React

| Property      | Value                |
| ------------- | -------------------- |
| Package       | `react`, `react-dom` |
| Version       | `^18.3.1`            |
| Purpose       | UI library           |
| Documentation | https://react.dev    |

**Usage Patterns:**

- Hooks: `useState`, `useEffect`, `useCallback`, `useMemo`, `useContext`
- Context: Defined in `app/providers.tsx` (or `app/providers/`)
- Custom hooks: `hooks/use*.tsx`

### TypeScript

| Property | Value           |
| -------- | --------------- |
| Package  | `typescript`    |
| Version  | `^5.3.0`        |
| Purpose  | Type safety     |
| Config   | `tsconfig.json` |

**Usage Patterns:**

- Strict mode enabled
- Path aliases: `@/*`, `@/components/*`, etc.
- Types in `types/index.ts`, database types in `types/supabase.ts`

---

## Backend & Data

### Supabase

| Property      | Value                                                          |
| ------------- | -------------------------------------------------------------- |
| Packages      | `@supabase/supabase-js`, `@supabase/ssr`                       |
| Versions      | `^2.89.0`, `^0.8.0`                                            |
| Purpose       | Database (PostgreSQL), authentication, real-time subscriptions |
| Documentation | https://supabase.com/docs                                      |

**Usage Patterns:**

```typescript
// Browser client (singleton)
import { getSupabaseClient } from "@/lib/supabase/client";

// Server client (for server components/actions)
import { createServerClient } from "@/lib/supabase/server";

// Admin client (bypasses RLS)
import { createAdminClient } from "@/lib/supabase/admin";
```

**Files:**

- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client
- `lib/supabase/admin.ts` - Admin client
- `lib/supabase/middleware.ts` - Session refresh

### TanStack Query (React Query)

| Property      | Value                                           |
| ------------- | ----------------------------------------------- |
| Package       | `@tanstack/react-query`                         |
| Version       | `^5.90.16`                                      |
| Purpose       | Server state management, caching, data fetching |
| Documentation | https://tanstack.com/query/latest               |

**Usage Patterns:**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ["tasks", boardId],
  queryFn: () => getTasks(boardId),
});

// Mutations with cache invalidation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createTask,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  },
});
```

---

## UI Components

### Radix UI Primitives

| Property      | Value                               |
| ------------- | ----------------------------------- |
| Packages      | `@radix-ui/react-*` (20+ packages)  |
| Purpose       | Unstyled, accessible UI primitives  |
| Documentation | https://www.radix-ui.com/primitives |

**Installed Primitives:**

- `@radix-ui/react-accordion`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-label`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-progress`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slider`
- `@radix-ui/react-slot`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `@radix-ui/react-tooltip`

**Usage**: Import from `components/ui/` which wraps Radix primitives with styling.

### shadcn/ui Components

| Property      | Value                                     |
| ------------- | ----------------------------------------- |
| Location      | `components/ui/`                          |
| Purpose       | Pre-styled Radix components with Tailwind |
| Documentation | https://ui.shadcn.com                     |

**Available Components** (48 files in `components/ui/`):

- Accordion, Alert, AlertDialog, Avatar
- Badge, Button, Calendar, Card
- Checkbox, Collapsible, Command, ContextMenu
- Dialog, Drawer, DropdownMenu, Form
- HoverCard, Input, Label, Menubar
- NavigationMenu, Popover, Progress, RadioGroup
- ScrollArea, Select, Separator, Sheet
- Skeleton, Slider, Sonner (toasts), Switch
- Table, Tabs, Textarea, Toast
- Toggle, ToggleGroup, Tooltip
- And more...

**Usage Pattern:**

```typescript
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
```

### Lucide React (Icons)

| Property      | Value                                  |
| ------------- | -------------------------------------- |
| Package       | `lucide-react`                         |
| Version       | `0.487.0`                              |
| Purpose       | Icon library (Feather icons successor) |
| Documentation | https://lucide.dev                     |

**Usage Pattern:**

```typescript
import { Plus, Trash, Settings, ChevronDown } from "lucide-react";

<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Task
</Button>
```

### Sonner (Toasts)

| Property      | Value                        |
| ------------- | ---------------------------- |
| Package       | `sonner`                     |
| Version       | `2.0.3`                      |
| Purpose       | Toast notifications          |
| Documentation | https://sonner.emilkowal.ski |

**Usage Pattern:**

```typescript
import { toast } from "sonner";

toast.success("Task created successfully");
toast.error("Failed to delete task");
toast.loading("Saving changes...");
```

### Vaul (Drawer)

| Property | Value                            |
| -------- | -------------------------------- |
| Package  | `vaul`                           |
| Version  | `1.1.2`                          |
| Purpose  | Mobile-friendly drawer component |

### cmdk (Command Palette)

| Property | Value                          |
| -------- | ------------------------------ |
| Package  | `cmdk`                         |
| Version  | `1.1.1`                        |
| Purpose  | Command palette / command menu |

---

## Forms & Validation

### React Hook Form

| Property      | Value                       |
| ------------- | --------------------------- |
| Package       | `react-hook-form`           |
| Version       | `7.55.0`                    |
| Purpose       | Form state management       |
| Documentation | https://react-hook-form.com |

**Usage Pattern:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { title: "", description: "" },
});
```

### Zod

| Property      | Value                             |
| ------------- | --------------------------------- |
| Package       | `zod`                             |
| Version       | `^4.3.2`                          |
| Purpose       | Schema validation, type inference |
| Documentation | https://zod.dev                   |

**Usage Patterns:**

```typescript
import { z } from "zod";

// Define schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

// Infer type from schema
export type Task = z.infer<typeof TaskSchema>;

// Validate data
const result = TaskSchema.safeParse(data);
if (!result.success) {
  console.error(result.error);
}
```

**Schema Files:** `lib/validations/*.schema.ts`

---

## Drag & Drop

### react-dnd

| Property      | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| Packages      | `react-dnd`, `react-dnd-html5-backend`, `react-dnd-touch-backend` |
| Versions      | `16.0.1`, `16.0.1`, `^16.0.1`                                     |
| Purpose       | Drag and drop for Kanban boards                                   |
| Documentation | https://react-dnd.github.io/react-dnd                             |

**Usage Pattern:**

```typescript
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// In provider (already set up in app/providers.tsx)
<DndProvider backend={HTML5Backend}>
  {children}
</DndProvider>

// In draggable component
const [{ isDragging }, drag] = useDrag({
  type: "TASK",
  item: { id: task.id },
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
});

// In drop target
const [{ isOver }, drop] = useDrop({
  accept: "TASK",
  drop: (item) => handleDrop(item),
  collect: (monitor) => ({
    isOver: monitor.isOver(),
  }),
});
```

---

## Rich Text Editing

### TipTap

| Property      | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| Packages      | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*` |
| Versions      | `^3.13.0`                                                     |
| Purpose       | Rich text editor for task descriptions, comments              |
| Documentation | https://tiptap.dev                                            |

**Installed Extensions:**

- `@tiptap/starter-kit` - Basic editing (bold, italic, lists, etc.)
- `@tiptap/extension-image` - Image support
- `@tiptap/extension-link` - Hyperlinks
- `@tiptap/extension-mention` - @mentions
- `@tiptap/extension-placeholder` - Placeholder text

**Usage Location:** `components/RichTextEditor.tsx`, `components/EnhancedRichTextEditor.tsx`

### DOMPurify

| Property | Value                        |
| -------- | ---------------------------- |
| Package  | `dompurify`                  |
| Version  | `^3.3.1`                     |
| Purpose  | Sanitize HTML to prevent XSS |

---

## Styling & Animation

### Tailwind CSS

| Property | Value                                 |
| -------- | ------------------------------------- |
| Package  | `tailwindcss`, `@tailwindcss/postcss` |
| Version  | `4.1.12`                              |
| Purpose  | Utility-first CSS                     |
| Config   | `postcss.config.mjs`, inline config   |

### Class Utilities

| Property | Value                                                    |
| -------- | -------------------------------------------------------- |
| Packages | `clsx`, `tailwind-merge`, `class-variance-authority`     |
| Versions | `2.1.1`, `3.2.0`, `0.7.1`                                |
| Purpose  | Conditional classes, merge conflicts, variant management |

**Usage Pattern:**

```typescript
import { cn } from "@/lib/utils";  // combines clsx + tailwind-merge

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  className
)} />
```

### Motion (Framer Motion)

| Property      | Value              |
| ------------- | ------------------ |
| Package       | `motion`           |
| Version       | `12.23.24`         |
| Purpose       | Animation library  |
| Documentation | https://motion.dev |

### next-themes

| Property | Value                   |
| -------- | ----------------------- |
| Package  | `next-themes`           |
| Version  | `0.4.6`                 |
| Purpose  | Dark/light mode theming |

---

## Testing

### Vitest (Unit Testing)

| Property      | Value                                         |
| ------------- | --------------------------------------------- |
| Packages      | `vitest`, `@vitest/ui`, `@vitest/coverage-v8` |
| Versions      | `^1.6.1`                                      |
| Purpose       | Unit testing framework                        |
| Config        | `vitest.config.ts`                            |
| Documentation | https://vitest.dev                            |

**Usage:**

```bash
pnpm test        # Run tests once
pnpm test:watch  # Watch mode
pnpm test:ui     # Visual UI
pnpm test:coverage  # With coverage
```

### Playwright (E2E Testing)

| Property      | Value                      |
| ------------- | -------------------------- |
| Package       | `@playwright/test`         |
| Version       | `^1.57.0`                  |
| Purpose       | End-to-end browser testing |
| Config        | `playwright.config.ts`     |
| Documentation | https://playwright.dev     |

**Usage:**

```bash
pnpm test:e2e  # Run E2E tests
```

### Testing Library

| Property | Value                                                                                |
| -------- | ------------------------------------------------------------------------------------ |
| Packages | `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` |
| Versions | `^14.3.1`, `^6.9.1`, `^14.6.1`                                                       |
| Purpose  | React component testing utilities                                                    |

### MSW (Mock Service Worker)

| Property | Value                      |
| -------- | -------------------------- |
| Package  | `msw`                      |
| Version  | `^2.12.4`                  |
| Purpose  | API mocking for tests      |
| Handlers | `lib/test-utils/handlers/` |

### jsdom

| Property | Value                      |
| -------- | -------------------------- |
| Package  | `jsdom`                    |
| Version  | `^24.1.3`                  |
| Purpose  | DOM environment for Vitest |

---

## Utilities

### date-fns

| Property      | Value                |
| ------------- | -------------------- |
| Package       | `date-fns`           |
| Version       | `3.6.0`              |
| Purpose       | Date manipulation    |
| Documentation | https://date-fns.org |

**Usage Pattern:**

```typescript
import { format, parseISO, differenceInDays } from "date-fns";

format(new Date(), "MMM d, yyyy"); // "Jan 8, 2026"
differenceInDays(endDate, startDate);
```

### Recharts

| Property | Value                         |
| -------- | ----------------------------- |
| Package  | `recharts`                    |
| Version  | `2.15.2`                      |
| Purpose  | Charts and data visualization |

### Resend

| Property | Value                                        |
| -------- | -------------------------------------------- |
| Package  | `resend`                                     |
| Version  | `^6.6.0`                                     |
| Purpose  | Transactional email (invites, notifications) |

### Faker.js

| Property | Value                                  |
| -------- | -------------------------------------- |
| Package  | `@faker-js/faker`                      |
| Version  | `^10.1.0`                              |
| Purpose  | Generate fake data for testing/seeding |

### Other Utilities

| Package                    | Version   | Purpose                 |
| -------------------------- | --------- | ----------------------- |
| `react-day-picker`         | `8.10.1`  | Date picker component   |
| `react-resizable-panels`   | `2.1.7`   | Resizable panel layouts |
| `react-responsive-masonry` | `2.7.1`   | Masonry grid layout     |
| `embla-carousel-react`     | `8.6.0`   | Carousel component      |
| `input-otp`                | `1.4.2`   | OTP input component     |
| `react-popper`             | `2.3.0`   | Popper positioning      |
| `@popperjs/core`           | `2.11.8`  | Popper core             |
| `tippy.js`                 | `^6.3.7`  | Tooltip library         |
| `@use-gesture/react`       | `^10.3.1` | Gesture handling        |

---

## Adding New Libraries

### Process

1. **Check this document first** - Ensure the functionality isn't already covered
2. **Propose the library** - Explain why it's needed and alternatives considered
3. **Get approval** - Do not add without explicit user approval
4. **Install** - Add to `package.json` with appropriate version
5. **Document** - Add entry to this file following the format above
6. **Example** - Add usage example in the relevant source file

### Documentation Template

When adding a new library, use this template:

```markdown
### [Library Name]

| Property      | Value             |
| ------------- | ----------------- |
| Package       | `package-name`    |
| Version       | `x.x.x`           |
| Purpose       | Brief description |
| Documentation | https://...       |

**Usage Patterns:**
\`\`\`typescript
// Code example
\`\`\`

**Files:** Where it's primarily used
```

---

## MUI (Legacy - Consider Migration)

> ⚠️ **Note**: MUI packages are installed but the project primarily uses Radix/shadcn. Consider removing if not actively used.

| Packages              | Versions  |
| --------------------- | --------- |
| `@mui/material`       | `7.3.5`   |
| `@mui/icons-material` | `7.3.5`   |
| `@emotion/react`      | `11.14.0` |
| `@emotion/styled`     | `11.14.1` |

If these are only used in specific legacy components, consider migrating to Radix equivalents.
