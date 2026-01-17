/**
 * Unit tests for database client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock sql.js module
vi.mock("sql.js", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      Database: vi.fn().mockImplementation(() => ({
        run: vi.fn(),
        exec: vi.fn(() => []),
        close: vi.fn(),
        export: vi.fn(() => new Uint8Array()),
      })),
    }),
  ),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => new Uint8Array()),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("Database Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("initDatabase", () => {
    it("should initialize and return a database instance", async () => {
      const { initDatabase } = await import("../../db/client");
      const db = await initDatabase();

      expect(db).toBeDefined();
      expect(typeof db.run).toBe("function");
      expect(typeof db.exec).toBe("function");
    });

    it("should return the same instance on multiple calls", async () => {
      const { initDatabase } = await import("../../db/client");

      const db1 = await initDatabase();
      const db2 = await initDatabase();

      expect(db1).toBe(db2);
    });
  });

  describe("getDatabase", () => {
    it("should throw if database not initialized", async () => {
      // Reset modules to get a fresh state
      vi.resetModules();

      const { getDatabase } = await import("../../db/client");

      expect(() => getDatabase()).toThrow("Database not initialized");
    });

    it("should return database after initialization", async () => {
      const { initDatabase, getDatabase } = await import("../../db/client");

      await initDatabase();
      const db = getDatabase();

      expect(db).toBeDefined();
    });
  });

  describe("closeDatabase", () => {
    it("should close the database connection", async () => {
      const { initDatabase, closeDatabase, getDatabase } =
        await import("../../db/client");

      await initDatabase();
      closeDatabase();

      expect(() => getDatabase()).toThrow("Database not initialized");
    });

    it("should handle multiple close calls gracefully", async () => {
      const { initDatabase, closeDatabase } = await import("../../db/client");

      await initDatabase();

      expect(() => {
        closeDatabase();
        closeDatabase();
      }).not.toThrow();
    });
  });

  describe("saveDatabase", () => {
    it("should not throw when saving after init", async () => {
      const { initDatabase, saveDatabase } = await import("../../db/client");

      await initDatabase();

      expect(() => saveDatabase()).not.toThrow();
    });
  });
});
