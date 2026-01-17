/**
 * Test setup file
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";

// Store original env
const originalEnv = { ...process.env };

// Set up test environment variables
beforeAll(() => {
  // Required env vars for all tests
  process.env.GITHUB_APP_ID = "123456";
  process.env.GITHUB_PRIVATE_KEY =
    "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----";
  process.env.GITHUB_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.DATABASE_PATH = ":memory:";
  process.env.NODE_ENV = "test";
});

// Reset environment before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Restore timers after each test
afterEach(() => {
  vi.useRealTimers();
});

// Restore original environment after all tests
afterAll(() => {
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, originalEnv);
});

// Global error handler for unhandled rejections in tests
process.on("unhandledRejection", (reason, _promise) => {
  console.error("Unhandled Rejection in test:", reason);
});
