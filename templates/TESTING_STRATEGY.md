# Testing Strategy

> **Purpose**: This document defines the testing strategy, patterns, and requirements for {{projectName}}.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Pyramid](#testing-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [When Tests Are Required](#when-tests-are-required)
7. [Mocking Patterns](#mocking-patterns)
8. [Test Organization](#test-organization)

---

## Testing Philosophy

1. **Write tests that give confidence**, not tests that check boxes
2. **Test behavior, not implementation** - Tests should survive refactoring
3. **Fast feedback loop** - Unit tests should run in milliseconds
4. **Readable tests are maintainable tests** - Tests are documentation
5. **Test the unhappy path** - Error cases matter more than happy paths

---

## Testing Pyramid

```
          /\
         /  \
        / E2E \        ← Few, slow, comprehensive journey tests
       /--------\
      /          \
     / Integration \   ← Component/module integration tests
    /--------------\
   /                \
  /    Unit Tests    \ ← Many, fast, focused tests
 /--------------------\
```

| Layer       | Tool             | Quantity | Speed  | Purpose                             |
| ----------- | ---------------- | -------- | ------ | ----------------------------------- |
| Unit        | [TEST_FRAMEWORK] | Many     | Fast   | Test functions/modules in isolation |
| Integration | [TEST_FRAMEWORK] | Some     | Medium | Test module interactions            |
| E2E         | [E2E_FRAMEWORK]  | Few      | Slow   | Test critical user/system journeys  |

---

## Unit Testing

### Configuration

<!-- PROJECT-SPECIFIC: Define your test configuration -->

Test configuration file: `[vitest.config.ts / jest.config.js / etc.]`

### Running Tests

```bash
# Run all tests once
[test-command]

# Watch mode
[test-command] --watch

# With coverage
[test-command] --coverage

# Run specific file
[test-command] path/to/file.test.ts
```

### Test File Naming & Location

| Source File               | Test File Location             |
| ------------------------- | ------------------------------ |
| `src/utils/helper.ts`     | `src/utils/helper.test.ts`     |
| `src/services/user.ts`    | `src/services/user.test.ts`    |
| `lib/auth/permissions.ts` | `lib/auth/permissions.test.ts` |

### Test Structure Pattern

```typescript
describe("ModuleName", () => {
  // Setup that applies to all tests
  beforeEach(() => {
    // Reset mocks, setup test data
  });

  afterEach(() => {
    // Cleanup
  });

  describe("functionName", () => {
    it("should return X when given Y", () => {
      // Arrange
      const input = "test";

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe("expected");
    });

    it("should throw error when given invalid input", () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => functionName(invalidInput)).toThrow("Invalid input");
    });
  });
});
```

### Naming Conventions

- **Describe blocks**: Use the function/module name
- **Test cases**: Start with "should" and describe the behavior
- **Be specific**: "should return user when ID exists" not "should work"

---

## Integration Testing

Integration tests verify that modules work together correctly.

### What to Integration Test

- API endpoints with database interactions
- Service functions with external dependencies
- Authentication/authorization flows
- Complex workflows spanning multiple modules

### Integration Test Pattern

```typescript
describe("UserService Integration", () => {
  // Use real database (test instance)
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  it("should create user and send welcome email", async () => {
    // Arrange
    const input = { email: "test@example.com", name: "Test User" };

    // Act
    const result = await userService.createUser(input);

    // Assert
    expect(result.data).toBeDefined();
    expect(result.data.email).toBe(input.email);
    // Verify side effects
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: input.email }),
    );
  });
});
```

---

## End-to-End Testing

E2E tests verify complete user journeys through the application.

### What to E2E Test

- Critical user flows (signup, login, core features)
- Payment/checkout flows
- Data integrity across the full stack
- Cross-browser compatibility (if applicable)

### E2E Test Pattern

```typescript
// e2e/auth.spec.ts
describe("Authentication", () => {
  it("should allow user to sign up and log in", async () => {
    // Navigate to signup
    await page.goto("/signup");

    // Fill form
    await page.fill('[name="email"]', "newuser@example.com");
    await page.fill('[name="password"]', "securePassword123");
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL("/dashboard");

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
```

---

## When Tests Are Required

| Change Type          | Unit Test               | Integration Test | E2E Test          |
| -------------------- | ----------------------- | ---------------- | ----------------- |
| New utility function | ✅ Required             | ❌ Not needed    | ❌ Not needed     |
| New service function | ✅ Required             | ⚠️ Recommended   | ❌ Not needed     |
| New API endpoint     | ✅ Required             | ✅ Required      | ⚠️ If critical    |
| New feature          | ✅ Required             | ✅ Required      | ✅ Critical paths |
| Bug fix              | ✅ Regression           | ⚠️ If applicable | ⚠️ If E2E exists  |
| Refactoring          | ✅ Verify existing pass | ❌ Not needed    | ❌ Not needed     |

### Minimum Coverage Requirements

<!-- PROJECT-SPECIFIC: Adjust these thresholds -->

| Metric     | Minimum |
| ---------- | ------- |
| Statements | 80%     |
| Branches   | 80%     |
| Functions  | 80%     |
| Lines      | 80%     |

---

## Mocking Patterns

### When to Mock

- External services (APIs, databases in unit tests)
- Time-dependent functions
- Non-deterministic behavior (random, uuid)
- Expensive operations

### When NOT to Mock

- The module under test
- Simple utility functions
- In integration tests (use real implementations)

### Mock Examples

```typescript
// Mock a module
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock a specific function
const mockFn = vi.fn().mockReturnValue("mocked value");

// Mock time
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-01-19"));

// Restore
vi.useRealTimers();
vi.restoreAllMocks();
```

### Database Mocking vs Test Database

| Approach      | Use When                           |
| ------------- | ---------------------------------- |
| Mock database | Unit tests, testing error handling |
| Test database | Integration tests, testing queries |

---

## Test Organization

## Testing with File System Mocks

When testing code that interacts with the file system, use `memfs` for proper in-memory mocking:

### Installation

```bash
pnpm add -D memfs
```

### Configuration

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fs, vol } from "memfs";

// Mock fs and fs/promises with memfs implementations
vi.mock("fs", () => ({
  existsSync: (path: string) => fs.existsSync(path),
  readFileSync: (path: string, encoding?: string) =>
    fs.readFileSync(path, encoding),
  writeFileSync: (path: string, data: string) => fs.writeFileSync(path, data),
  mkdirSync: (path: string, options?: any) => fs.mkdirSync(path, options),
  readdirSync: (path: string, options?: any) => fs.readdirSync(path, options),
  statSync: (path: string) => fs.statSync(path),
}));

vi.mock("fs/promises", () => ({
  readFile: async (path: string, encoding?: string) =>
    fs.promises.readFile(path, encoding),
  writeFile: async (path: string, data: string) =>
    fs.promises.writeFile(path, data),
  mkdir: async (path: string, options?: any) =>
    fs.promises.mkdir(path, options),
  readdir: async (path: string, options?: any) =>
    fs.promises.readdir(path, options),
  stat: async (path: string) => fs.promises.stat(path),
}));

describe("Your Test Suite", () => {
  beforeEach(() => {
    // Reset the virtual file system before each test
    vol.reset();
  });

  it("should work with virtual files", async () => {
    // Create virtual files in memory
    vol.fromJSON({
      "/path/to/file.json": JSON.stringify({ key: "value" }),
      "/path/to/config.js": "module.exports = {};",
    });

    // Your test code using fs operations
    // The mocked fs will use memfs instead of real file system
  });
});
```

### Key Points

- **Import both `fs` and `vol`**: `vol` manages the virtual volume, `fs` provides the API
- **Provide actual implementations**: `vi.mock()` needs function implementations, not just module names
- **Reset before each test**: Use `vol.reset()` in `beforeEach()` to ensure test isolation
- **Use `vol.fromJSON()`**: Easiest way to create multiple virtual files at once
- **memfs is complete**: Supports both sync and async fs operations

---

## Test Organization

### Directory Structure

```
src/
├── services/
│   ├── user.ts
│   └── user.test.ts          # Co-located unit tests
├── utils/
│   ├── string.ts
│   └── string.test.ts
tests/
├── integration/               # Integration tests
│   └── api/
│       └── users.test.ts
├── e2e/                       # End-to-end tests
│   └── auth.spec.ts
├── fixtures/                  # Shared test data
│   └── users.ts
└── helpers/                   # Test utilities
    └── setup.ts
```

### Test Fixtures

Create reusable test data:

```typescript
// tests/fixtures/users.ts
export const testUser = {
  id: "test-id",
  email: "test@example.com",
  name: "Test User",
};

export function createTestUser(overrides = {}) {
  return { ...testUser, ...overrides };
}
```

### Test Helpers

Create reusable test utilities:

```typescript
// tests/helpers/setup.ts
export async function setupTestDatabase() {
  // Initialize test database
}

export async function clearTestData() {
  // Clear all test data
}
```

---

## CI/CD Integration

### Pre-commit

```bash
# Run before every commit
[test-command] --changed    # Only test changed files
```

### Pull Request

```bash
# Run on every PR
[test-command] --coverage   # Full test suite with coverage
```

### Required Checks

- [ ] All tests pass
- [ ] Coverage thresholds met
- [ ] No snapshot mismatches (if using snapshots)

---

## Related Documents

- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Coding standards
- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Canonical locations
