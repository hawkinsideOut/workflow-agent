# Testing Strategy

> **Purpose**: This document defines the testing strategy, patterns, and requirements for the project. Following these guidelines ensures comprehensive test coverage and prevents regressions.

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [Unit Testing with Vitest](#unit-testing-with-vitest)
3. [Component Library Testing](#component-library-testing)
4. [E2E Testing with Playwright](#e2e-testing-with-playwright)
5. [Test Infrastructure](#test-infrastructure)
6. [When Tests Are Required](#when-tests-are-required)
7. [Pre-Merge Checklist](#pre-merge-checklist)

---

## Testing Pyramid

Our testing strategy follows the testing pyramid model:

```
          /\
         /  \
        / E2E \        ← Few, slow, comprehensive user journey tests
       /--------\
      /          \
     / Integration \   ← Component + hook integration tests
    /--------------\
   /                \
  /    Unit Tests    \ ← Many, fast, focused tests
 /--------------------\
```

| Layer       | Tool                     | Quantity | Speed  | Purpose                                                       |
| ----------- | ------------------------ | -------- | ------ | ------------------------------------------------------------- |
| Unit        | Vitest                   | Many     | Fast   | Test individual functions, utilities, components in isolation |
| Integration | Vitest + Testing Library | Some     | Medium | Test component interactions, hooks with mocked services       |
| E2E         | Playwright               | Few      | Slow   | Test critical user journeys end-to-end                        |

---

## Unit Testing with Vitest

### Configuration

Located in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Running Tests

```bash
# Run all tests once
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Visual UI for test results
pnpm test:ui

# With coverage report
pnpm test:coverage
```

### Test File Naming & Location

| Source File                      | Test File Location                    |
| -------------------------------- | ------------------------------------- |
| `components/TaskCard.tsx`        | `components/TaskCard.test.tsx`        |
| `hooks/useDebounce.tsx`          | `hooks/useDebounce.test.tsx`          |
| `utils/authorization.ts`         | `utils/authorization.test.ts`         |
| `lib/validations/task.schema.ts` | `lib/validations/task.schema.test.ts` |

### Test Structure Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  mockTasks,
  createMockTask,
  seedTasks,
  clearLocalStorage,
} from "@test/fixtures";
import { TaskCard } from "./TaskCard";

describe("TaskCard", () => {
  beforeEach(() => {
    clearLocalStorage();
    seedTasks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should display task title and ticket ID", () => {
      const task = createMockTask({ title: "Test Task", ticketId: "TEST-0001" });
      render(<TaskCard task={task} />);

      expect(screen.getByText("Test Task")).toBeInTheDocument();
      expect(screen.getByText("TEST-0001")).toBeInTheDocument();
    });

    it("should show priority badge", () => {
      const task = createMockTask({ priority: "high" });
      render(<TaskCard task={task} />);

      expect(screen.getByTestId("priority-badge")).toHaveTextContent("High");
    });
  });

  describe("interactions", () => {
    it("should call onEdit when edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const task = createMockTask();

      render(<TaskCard task={task} onEdit={onEdit} />);

      await user.click(screen.getByTestId("edit-task-btn"));

      expect(onEdit).toHaveBeenCalledWith(task);
    });
  });
});
```

### Mocking Patterns

#### Mocking Hooks

```typescript
import { vi } from 'vitest';

// Mock a custom hook
vi.mock('@/hooks/useAuthorization', () => ({
  useAuthorization: () => ({
    can: {
      editTask: () => true,
      deleteTask: () => false,
    },
    currentUserRole: 'developer',
  }),
}));
```

#### Mocking Supabase Client

```typescript
// Already set up in test/setup.ts - uses MSW for API mocking
// For unit tests, you can also mock directly:

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
        })),
      })),
    })),
  })),
}));
```

#### Mocking Server Actions

```typescript
vi.mock('@/app/actions/tasks', () => ({
  getTasks: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
  createTask: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
  deleteTask: vi.fn().mockResolvedValue({ success: true, error: null }),
}));
```

---

## Component Library Testing

> **Reference**: See `guidelines/COMPONENT_LIBRARY.md` for component inventory and requirements.

Component library components require comprehensive testing with a **fail-fast approach**.

### Configuration

Vitest is configured with `bail: 1` to stop on first failure:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    bail: 1, // Stop on first failure
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
  },
});
```

### Running Component Tests

```bash
# Run component library tests only
pnpm test:components

# Watch mode for development
pnpm test:components:watch

# Update snapshots after intentional changes
pnpm test:update-snapshots
```

### Test File Structure

Every component in the library requires three files:

```
components/
├── StatusBadge.tsx           # Component implementation
├── StatusBadge.stories.tsx   # Storybook story
├── StatusBadge.test.tsx      # Unit + snapshot tests
└── __snapshots__/
    └── StatusBadge.test.tsx.snap
```

### Required Test Coverage

#### 1. Behavioral Tests

Test all logic and interactions:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import { mockFeatureFlag, clearFeatureFlagMocks, FeatureFlag } from "@/lib/feature-flags";

describe("StatusBadge", () => {
  afterEach(() => {
    clearFeatureFlagMocks();
  });

  it("should render without crashing", () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
    render(<StatusBadge status="todo" />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("should apply correct color for each status", () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
    const { container } = render(<StatusBadge status="in-progress" />);
    expect(container.firstChild).toHaveClass("bg-sky-50");
  });

  it("should respect size prop", () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
    const { container } = render(<StatusBadge status="todo" size="lg" />);
    expect(container.firstChild).toHaveClass("text-base");
  });

  it("should apply custom className", () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
    const { container } = render(<StatusBadge status="todo" className="custom" />);
    expect(container.firstChild).toHaveClass("custom");
  });
});
```

#### 2. Feature Flag Tests

Test both enabled and disabled states:

```typescript
describe("Feature Flag Behavior", () => {
  afterEach(() => {
    clearFeatureFlagMocks();
  });

  it("should return null when feature flag is disabled", () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, false);
    const { container } = render(<StatusBadge status="todo" />);
    expect(container.firstChild).toBeNull();
  });

  it("should render component when feature flag is enabled", () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
    const { container } = render(<StatusBadge status="todo" />);
    expect(container.firstChild).not.toBeNull();
  });
});
```

#### 3. Snapshot Tests

Capture visual output for all variants:

```typescript
describe("Snapshots", () => {
  beforeEach(() => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
  });

  afterEach(() => {
    clearFeatureFlagMocks();
  });

  // Test each status
  it.each(["todo", "in-progress", "review", "done"] as const)(
    "should match snapshot for status: %s",
    (status) => {
      const { container } = render(<StatusBadge status={status} />);
      expect(container).toMatchSnapshot();
    }
  );

  // Test each size
  it.each(["sm", "md", "lg"] as const)(
    "should match snapshot for size: %s",
    (size) => {
      const { container } = render(<StatusBadge status="todo" size={size} />);
      expect(container).toMatchSnapshot();
    }
  );

  // Test with icon hidden
  it("should match snapshot without icon", () => {
    const { container } = render(<StatusBadge status="todo" showIcon={false} />);
    expect(container).toMatchSnapshot();
  });
});
```

### Snapshot Update Workflow

When snapshots fail:

1. **Unintentional change?** → Fix the code, snapshots should pass
2. **Intentional change?** → Review the diff carefully:

   ```bash
   # View snapshot diff
   pnpm test:components

   # If changes are correct, update snapshots
   pnpm test:update-snapshots

   # Commit updated snapshots with explanation
   git add -A
   git commit -m "test: update StatusBadge snapshots for new size variant"
   ```

### Component Test Checklist

Before submitting PR:

- [ ] All behavioral tests pass
- [ ] All variants have snapshot tests
- [ ] Feature flag enabled/disabled tested
- [ ] Custom className prop tested
- [ ] Edge cases handled (empty, null, undefined)
- [ ] Accessibility: ARIA attributes present (where applicable)
- [ ] Storybook story renders correctly

---

## E2E Testing with Playwright

### Configuration

Located in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Running E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test e2e/critical-tests.spec.ts

# Run with headed browser
npx playwright test --headed

# Generate test report
npx playwright show-report
```

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login or set up authenticated state
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new task', async ({ page }) => {
    // Navigate to board
    await page.click('[data-testid="nav-boards"]');

    // Open create dialog
    await page.click('[data-testid="create-task-btn"]');

    // Fill form
    await page.fill('[data-testid="task-title-input"]', 'New E2E Task');
    await page.selectOption('[data-testid="priority-select"]', 'high');

    // Submit
    await page.click('[data-testid="submit-task-btn"]');

    // Verify creation
    await expect(
      page.locator('[data-testid="task-card"]').filter({ hasText: 'New E2E Task' })
    ).toBeVisible();
  });

  test('should move task between columns', async ({ page }) => {
    // Navigate to kanban board
    await page.goto('/dashboard?view=kanban');

    // Get task card
    const taskCard = page.locator('[data-testid="task-card-TASK-0001"]');
    const targetColumn = page.locator('[data-testid="column-in-progress"]');

    // Drag and drop
    await taskCard.dragTo(targetColumn);

    // Verify move
    await expect(targetColumn.locator('[data-testid="task-card-TASK-0001"]')).toBeVisible();
  });
});
```

### Critical Test Paths

The following user journeys MUST have E2E tests (`e2e/critical-tests.spec.ts`):

1. **Authentication Flow**
   - Login with valid credentials
   - Login with invalid credentials (error handling)
   - Logout

2. **Task CRUD**
   - Create task with required fields
   - View task details
   - Edit task
   - Delete task

3. **Board Management**
   - View kanban board
   - Move task between columns
   - Create new column

4. **Sprint Management**
   - Create sprint
   - Add tasks to sprint
   - Complete sprint

5. **User Management (Admin)**
   - View user list
   - Change user role
   - Suspend user

---

## Test Infrastructure

### Test Setup (`test/setup.ts`)

The setup file initializes:

1. **MSW Server** - Mocks API responses
2. **Next.js Mocks** - Router, cache, navigation
3. **Supabase Mocks** - Client initialization
4. **jsdom Environment** - DOM simulation

```typescript
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { server } from '@/lib/test-utils/server';
import '@testing-library/jest-dom';

// Start MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
```

### Test Fixtures (`test/fixtures.tsx`)

Provides mock data factories and seeding utilities:

```typescript
import type { Task, Board, Sprint, User } from '@/types';

// ============== Mock Data ==============
export const mockUser: User = {
  id: 'user-001',
  email: 'test@example.com',
  name: 'Test User',
  role: 'developer',
};

export const mockTasks: Task[] = [
  { id: 'task-001', ticketId: 'TEST-0001', title: 'First Task', priority: 'high', status: 'todo' },
  {
    id: 'task-002',
    ticketId: 'TEST-0002',
    title: 'Second Task',
    priority: 'medium',
    status: 'in_progress',
  },
];

// ============== Factory Functions ==============
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}`,
    ticketId: `TEST-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, '0')}`,
    title: 'Mock Task',
    description: '',
    priority: 'medium',
    status: 'todo',
    type: 'task',
    boardId: 'board-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockBoard(overrides: Partial<Board> = {}): Board {
  /* ... */
}
export function createMockSprint(overrides: Partial<Sprint> = {}): Sprint {
  /* ... */
}

// ============== Seeding Functions ==============
export function seedTasks(tasks: Task[] = mockTasks): void {
  localStorage.setItem('pm_tasks', JSON.stringify(tasks));
}

export function seedBoards(): void {
  /* ... */
}
export function seedSprints(): void {
  /* ... */
}

export function clearLocalStorage(): void {
  localStorage.clear();
}

// ============== Known Gaps ==============
// Document areas that don't have full test coverage yet
export const KNOWN_GAPS = {
  dragAndDrop: 'Drag-and-drop testing requires special handling with react-dnd',
  realTime: 'Real-time subscription testing not fully implemented',
  fileUpload: 'File upload testing requires MSW file handling',
};
```

### MSW Handlers (`lib/test-utils/handlers/`)

API mocking handlers organized by domain:

```
lib/test-utils/
├── handlers/
│   ├── index.ts      # Combines all handlers
│   ├── tasks.ts      # Task API handlers
│   ├── boards.ts     # Board API handlers
│   ├── sprints.ts    # Sprint API handlers
│   └── auth.ts       # Auth API handlers
├── server.ts         # MSW server setup
└── db.ts             # Mock database state
```

Example handler (`lib/test-utils/handlers/tasks.ts`):

```typescript
import { http, HttpResponse } from 'msw';
import { mockTasks } from '@test/fixtures';

export const taskHandlers = [
  http.get('*/rest/v1/tasks*', () => {
    return HttpResponse.json(mockTasks);
  }),

  http.post('*/rest/v1/tasks', async ({ request }) => {
    const body = await request.json();
    const newTask = { id: `task-${Date.now()}`, ...body };
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.delete('*/rest/v1/tasks*', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

---

## When Tests Are Required

### Required Tests

| Change Type                           | Unit Test              | E2E Test               |
| ------------------------------------- | ---------------------- | ---------------------- |
| New component (complex)               | ✅ Required            | ⚠️ If critical path    |
| New component (simple/presentational) | ⚠️ Recommended         | ❌ Not required        |
| New hook                              | ✅ Required            | ❌ Not required        |
| New server action                     | ⚠️ Recommended         | ❌ Not required        |
| New utility function                  | ✅ Required            | ❌ Not required        |
| New feature                           | ✅ Required            | ✅ Required            |
| Bug fix                               | ✅ Regression test     | ⚠️ If E2E exists       |
| Refactor                              | ✅ Existing tests pass | ✅ Existing tests pass |

### Definition of "Complex Component"

A component is considered complex if it has:

- State management (`useState`, `useReducer`)
- Side effects (`useEffect`)
- Event handlers that modify data
- Conditional rendering based on props/state
- Integration with context providers
- Form handling

### Test Coverage Targets

| Metric          | Target |
| --------------- | ------ |
| Line Coverage   | 70%+   |
| Branch Coverage | 60%+   |
| Critical Paths  | 100%   |

---

## Pre-Merge Checklist

Before creating a PR, ensure:

### Unit Tests

- [ ] All new functions/components have tests
- [ ] Tests cover happy path and error cases
- [ ] `pnpm test` passes locally
- [ ] No skipped tests (`.skip`) without justification

### E2E Tests

- [ ] Critical user journeys covered
- [ ] `data-testid` attributes added to new interactive elements
- [ ] `pnpm test:e2e` passes locally (or on CI)

### Test Quality

- [ ] Tests are isolated (don't depend on other tests)
- [ ] Tests clean up after themselves
- [ ] No flaky tests (tests that sometimes pass/fail)
- [ ] Descriptive test names (`should do X when Y`)

---

## `data-testid` Conventions

Add `data-testid` attributes to elements that E2E tests need to interact with.

### Naming Pattern

```
<element>-<purpose>[-<identifier>]
```

### Examples

```tsx
// Buttons
<button data-testid="create-task-btn">Create</button>
<button data-testid="delete-task-btn">Delete</button>
<button data-testid="submit-form-btn">Submit</button>

// Inputs
<input data-testid="task-title-input" />
<input data-testid="email-input" />
<select data-testid="priority-select" />

// Cards/Items with IDs
<div data-testid={`task-card-${task.id}`}>...</div>
<div data-testid={`task-card-${task.ticketId}`}>...</div>

// Containers
<div data-testid="column-todo">...</div>
<div data-testid="column-in-progress">...</div>
<nav data-testid="main-sidebar">...</nav>

// Modal/Dialog
<div data-testid="task-dialog">...</div>
<div data-testid="confirm-dialog">...</div>
```

### Anti-patterns

```tsx
// ❌ Don't use generic IDs
<button data-testid="button">...</button>
<input data-testid="input" />

// ❌ Don't use CSS class-like naming
<div data-testid="task-card-container-wrapper">...</div>

// ❌ Don't use dynamic content in IDs (use stable identifiers)
<div data-testid={`task-${task.title.toLowerCase()}`}>...</div>

// ✅ Use stable identifiers
<div data-testid={`task-card-${task.id}`}>...</div>
```

---

## Related Documents

- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Required files for each change type
- [TESTING_GUIDE.md](../TESTING_GUIDE.md) - Manual testing checklist
- [QUICK_START_TESTING.md](../QUICK_START_TESTING.md) - Getting started with testing
