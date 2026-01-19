/**
 * Test setup file
 * Runs before all tests to configure the test environment
 */

import { webcrypto } from "node:crypto";
import { beforeEach, vi } from "vitest";

// Polyfill crypto for Node.js environment
// The global crypto object is available in browsers and newer Node.js with --experimental-global-webcrypto
// but in test environments we need to polyfill it
if (typeof globalThis.crypto === "undefined") {
  // @ts-expect-error - webcrypto is compatible with Crypto
  globalThis.crypto = webcrypto;
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
