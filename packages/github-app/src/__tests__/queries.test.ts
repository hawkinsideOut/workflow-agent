/**
 * Unit tests for database queries
 * Uses an in-memory SQLite database for testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the database module before importing queries
vi.mock("../db/client", () => {
  const initSqlJs = vi.fn();
  let db: any = null;

  return {
    initDatabase: vi.fn(async () => {
      const SQL = await import("sql.js");
      const SQLModule = await SQL.default();
      db = new SQLModule.Database();
      // Run schema
      db.run(`
        CREATE TABLE IF NOT EXISTS retry_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          commit_sha TEXT NOT NULL,
          repo_owner TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          workflow_run_id INTEGER,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT,
          last_error TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(commit_sha, repo_owner, repo_name)
        );
        CREATE TABLE IF NOT EXISTS visual_baselines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          repo_owner TEXT,
          repo_name TEXT,
          screenshot_path TEXT NOT NULL,
          viewport_width INTEGER NOT NULL DEFAULT 1280,
          viewport_height INTEGER NOT NULL DEFAULT 720,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(name, repo_owner, repo_name)
        );
        CREATE TABLE IF NOT EXISTS visual_comparisons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          baseline_id INTEGER NOT NULL,
          commit_sha TEXT,
          pr_number INTEGER,
          before_path TEXT NOT NULL,
          after_path TEXT NOT NULL,
          has_differences INTEGER NOT NULL DEFAULT 0,
          difference_summary TEXT,
          difference_details TEXT,
          confidence REAL,
          llm_provider TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS webhook_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          action TEXT,
          repo_owner TEXT,
          repo_name TEXT,
          payload_summary TEXT,
          processed INTEGER NOT NULL DEFAULT 0,
          error TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS auto_heal_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          retry_attempt_id INTEGER NOT NULL,
          error_message TEXT NOT NULL,
          fix_prompt TEXT,
          fix_applied TEXT,
          commit_sha_before TEXT,
          commit_sha_after TEXT,
          success INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      return db;
    }),
    getDatabase: vi.fn(() => db),
    saveDatabase: vi.fn(),
    closeDatabase: vi.fn(() => {
      if (db) {
        db.close();
        db = null;
      }
    }),
  };
});

// Import after mocking
import {
  getRetryAttempt,
  getOrCreateRetryAttempt,
  incrementAttempt,
  markSuccess,
  markExhausted,
  isMaxRetriesReached,
  resetAttempts,
  getActiveAttempts,
  getBaseline,
  upsertBaseline,
  listBaselines,
  deleteBaseline,
  recordComparison,
  getComparisonHistory,
  logWebhookEvent,
  markWebhookProcessed,
  getRecentWebhookEvents,
  recordHealAttempt,
  getHealHistory,
} from "../db/queries";
import { initDatabase, closeDatabase } from "../db/client";

describe("Database Queries", () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(() => {
    closeDatabase();
    vi.clearAllMocks();
  });

  describe("Retry Attempts", () => {
    const testCommit = "abc123def456";
    const testOwner = "test-owner";
    const testRepo = "test-repo";

    it("should return null for non-existent attempt", () => {
      const attempt = getRetryAttempt("nonexistent", "owner", "repo");
      expect(attempt).toBeNull();
    });

    it("should create a new retry attempt", () => {
      const attempt = getOrCreateRetryAttempt(
        testCommit,
        testOwner,
        testRepo,
        12345,
      );

      expect(attempt).toBeDefined();
      expect(attempt.commit_sha).toBe(testCommit);
      expect(attempt.repo_owner).toBe(testOwner);
      expect(attempt.repo_name).toBe(testRepo);
      expect(attempt.workflow_run_id).toBe(12345);
      expect(attempt.attempt_count).toBe(0);
      expect(attempt.status).toBe("pending");
    });

    it("should return existing attempt if already exists", () => {
      const first = getOrCreateRetryAttempt(testCommit, testOwner, testRepo);
      const second = getOrCreateRetryAttempt(testCommit, testOwner, testRepo);

      expect(first.id).toBe(second.id);
    });

    it("should increment attempt count", () => {
      getOrCreateRetryAttempt(testCommit, testOwner, testRepo);

      const updated = incrementAttempt(
        testCommit,
        testOwner,
        testRepo,
        "Test error",
      );

      expect(updated.attempt_count).toBe(1);
      expect(updated.last_error).toBe("Test error");
      expect(updated.status).toBe("healing");
      expect(updated.last_attempt_at).not.toBeNull();
    });

    it("should mark attempt as successful", () => {
      getOrCreateRetryAttempt(testCommit, testOwner, testRepo);
      markSuccess(testCommit, testOwner, testRepo);

      const attempt = getRetryAttempt(testCommit, testOwner, testRepo);
      expect(attempt?.status).toBe("success");
    });

    it("should mark attempt as exhausted", () => {
      getOrCreateRetryAttempt(testCommit, testOwner, testRepo);
      markExhausted(testCommit, testOwner, testRepo);

      const attempt = getRetryAttempt(testCommit, testOwner, testRepo);
      expect(attempt?.status).toBe("exhausted");
    });

    it("should check if max retries reached", () => {
      getOrCreateRetryAttempt(testCommit, testOwner, testRepo);

      expect(isMaxRetriesReached(testCommit, testOwner, testRepo, 10)).toBe(
        false,
      );

      // Increment 10 times
      for (let i = 0; i < 10; i++) {
        incrementAttempt(testCommit, testOwner, testRepo);
      }

      expect(isMaxRetriesReached(testCommit, testOwner, testRepo, 10)).toBe(
        true,
      );
    });

    it("should reset attempts", () => {
      const attempt = getOrCreateRetryAttempt(testCommit, testOwner, testRepo);
      incrementAttempt(testCommit, testOwner, testRepo);
      incrementAttempt(testCommit, testOwner, testRepo);

      resetAttempts(testCommit, testOwner, testRepo);

      const reset = getRetryAttempt(testCommit, testOwner, testRepo);
      expect(reset?.attempt_count).toBe(0);
      expect(reset?.status).toBe("pending");
    });

    it("should get active attempts", () => {
      getOrCreateRetryAttempt("commit1", testOwner, testRepo);
      getOrCreateRetryAttempt("commit2", testOwner, testRepo);
      incrementAttempt("commit1", testOwner, testRepo); // Sets to 'healing'

      const active = getActiveAttempts();
      expect(active.length).toBe(2);
    });
  });

  describe("Visual Baselines", () => {
    const testName = "homepage";
    const testUrl = "http://localhost:3000";
    const testPath = "/baselines/homepage.png";

    it("should return null for non-existent baseline", () => {
      const baseline = getBaseline("nonexistent");
      expect(baseline).toBeNull();
    });

    it("should create a new baseline", () => {
      const baseline = upsertBaseline(testName, testUrl, testPath);

      expect(baseline).toBeDefined();
      expect(baseline.name).toBe(testName);
      expect(baseline.url).toBe(testUrl);
      expect(baseline.screenshot_path).toBe(testPath);
      expect(baseline.viewport_width).toBe(1280);
      expect(baseline.viewport_height).toBe(720);
    });

    it("should update existing baseline", () => {
      upsertBaseline(testName, testUrl, testPath);
      const updated = upsertBaseline(
        testName,
        "http://localhost:4000",
        "/new/path.png",
        1920,
        1080,
      );

      expect(updated.url).toBe("http://localhost:4000");
      expect(updated.screenshot_path).toBe("/new/path.png");
      expect(updated.viewport_width).toBe(1920);
      expect(updated.viewport_height).toBe(1080);
    });

    it("should list all baselines", () => {
      upsertBaseline("page1", "http://localhost:3000/1", "/path1.png");
      upsertBaseline("page2", "http://localhost:3000/2", "/path2.png");
      upsertBaseline("page3", "http://localhost:3000/3", "/path3.png");

      const baselines = listBaselines();
      expect(baselines.length).toBe(3);
    });

    it("should filter baselines by repo", () => {
      upsertBaseline(
        "page1",
        "http://localhost/1",
        "/path1.png",
        1280,
        720,
        "owner",
        "repo1",
      );
      upsertBaseline(
        "page2",
        "http://localhost/2",
        "/path2.png",
        1280,
        720,
        "owner",
        "repo2",
      );

      const repo1Baselines = listBaselines("owner", "repo1");
      expect(repo1Baselines.length).toBe(1);
      expect(repo1Baselines[0].name).toBe("page1");
    });

    it("should delete a baseline", () => {
      upsertBaseline(testName, testUrl, testPath);

      const deleted = deleteBaseline(testName);
      expect(deleted).toBe(true);

      const check = getBaseline(testName);
      expect(check).toBeNull();
    });

    it("should return false when deleting non-existent baseline", () => {
      const deleted = deleteBaseline("nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("Visual Comparisons", () => {
    it("should record a comparison", () => {
      const baseline = upsertBaseline(
        "test",
        "http://localhost",
        "/baseline.png",
      );

      const comparison = recordComparison(
        baseline.id,
        "/before.png",
        "/after.png",
        true,
        "Button color changed",
        JSON.stringify([
          { area: "button", description: "Color changed", severity: "minor" },
        ]),
        0.95,
        "anthropic",
        "abc123",
        42,
      );

      expect(comparison).toBeDefined();
      expect(comparison.baseline_id).toBe(baseline.id);
      expect(comparison.has_differences).toBe(1);
      expect(comparison.difference_summary).toBe("Button color changed");
      expect(comparison.confidence).toBe(0.95);
      expect(comparison.commit_sha).toBe("abc123");
      expect(comparison.pr_number).toBe(42);
    });

    it("should get comparison history", () => {
      const baseline = upsertBaseline(
        "test",
        "http://localhost",
        "/baseline.png",
      );

      recordComparison(baseline.id, "/before1.png", "/after1.png", false);
      recordComparison(
        baseline.id,
        "/before2.png",
        "/after2.png",
        true,
        "Changed",
      );
      recordComparison(baseline.id, "/before3.png", "/after3.png", false);

      const history = getComparisonHistory(baseline.id);
      expect(history.length).toBe(3);
    });

    it("should limit comparison history", () => {
      const baseline = upsertBaseline(
        "test",
        "http://localhost",
        "/baseline.png",
      );

      for (let i = 0; i < 15; i++) {
        recordComparison(
          baseline.id,
          `/before${i}.png`,
          `/after${i}.png`,
          false,
        );
      }

      const history = getComparisonHistory(baseline.id, 5);
      expect(history.length).toBe(5);
    });
  });

  describe("Webhook Events", () => {
    it("should log a webhook event", () => {
      const event = logWebhookEvent(
        "workflow_run",
        "completed",
        "owner",
        "repo",
        "Workflow completed successfully",
      );

      expect(event).toBeDefined();
      expect(event.event_type).toBe("workflow_run");
      expect(event.action).toBe("completed");
      expect(event.processed).toBe(0);
    });

    it("should mark webhook as processed", () => {
      const event = logWebhookEvent("workflow_run", "completed");
      markWebhookProcessed(event.id);

      const events = getRecentWebhookEvents(10);
      const processed = events.find((e) => e.id === event.id);
      expect(processed?.processed).toBe(1);
    });

    it("should mark webhook as processed with error", () => {
      const event = logWebhookEvent("workflow_run", "completed");
      markWebhookProcessed(event.id, "Processing failed");

      const events = getRecentWebhookEvents(10);
      const processed = events.find((e) => e.id === event.id);
      expect(processed?.processed).toBe(1);
      expect(processed?.error).toBe("Processing failed");
    });

    it("should get recent webhook events", () => {
      for (let i = 0; i < 5; i++) {
        logWebhookEvent(`event_${i}`, "action");
      }

      const events = getRecentWebhookEvents(3);
      expect(events.length).toBe(3);
    });
  });

  describe("Auto-Heal History", () => {
    it("should record a heal attempt", () => {
      const retry = getOrCreateRetryAttempt("commit", "owner", "repo");

      const healRecord = recordHealAttempt(
        retry.id,
        "TypeScript compilation error",
        "workflow-agent fix --error 'TS2322'",
        "Changed type from string to number",
        "abc123",
        "def456",
        true,
        5000,
      );

      expect(healRecord).toBeDefined();
      expect(healRecord.retry_attempt_id).toBe(retry.id);
      expect(healRecord.error_message).toBe("TypeScript compilation error");
      expect(healRecord.success).toBe(1);
      expect(healRecord.duration_ms).toBe(5000);
    });

    it("should get heal history for a retry attempt", () => {
      const retry = getOrCreateRetryAttempt("commit", "owner", "repo");

      recordHealAttempt(
        retry.id,
        "Error 1",
        undefined,
        undefined,
        undefined,
        undefined,
        false,
      );
      recordHealAttempt(
        retry.id,
        "Error 2",
        undefined,
        undefined,
        undefined,
        undefined,
        false,
      );
      recordHealAttempt(
        retry.id,
        "Error 3",
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

      const history = getHealHistory(retry.id);
      expect(history.length).toBe(3);
    });
  });
});
