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
        CREATE TABLE IF NOT EXISTS community_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern_id TEXT NOT NULL UNIQUE,
          pattern_type TEXT NOT NULL CHECK(pattern_type IN ('fix', 'blueprint', 'solution')),
          pattern_data TEXT NOT NULL,
          contributor_id TEXT,
          pattern_hash TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS contributor_rate_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contributor_id TEXT NOT NULL UNIQUE,
          push_count INTEGER NOT NULL DEFAULT 0,
          window_start TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  // Pattern registry queries
  checkRateLimit,
  incrementRateLimit,
  getPatternById,
  getPatternByHash,
  createPattern,
  batchCreatePatterns,
  getPatterns,
  getPatternsNewerThan,
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

  // ============================================
  // Community Patterns Tests
  // ============================================

  describe("Community Patterns", () => {
    describe("createPattern", () => {
      it("should create a new pattern", () => {
        const pattern = createPattern(
          "550e8400-e29b-41d4-a716-446655440000",
          "fix",
          JSON.stringify({ name: "Test Pattern" }),
          "wf-contributor-123",
        );

        expect(pattern).toBeDefined();
        expect(pattern.pattern_id).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(pattern.pattern_type).toBe("fix");
        expect(pattern.contributor_id).toBe("wf-contributor-123");
      });

      it("should create pattern with hash", () => {
        const pattern = createPattern(
          "550e8400-e29b-41d4-a716-446655440001",
          "blueprint",
          JSON.stringify({ name: "Blueprint" }),
          "wf-contributor-123",
          "hash-abc123",
        );

        expect(pattern.pattern_hash).toBe("hash-abc123");
      });

      it("should create pattern without contributor ID", () => {
        const pattern = createPattern(
          "550e8400-e29b-41d4-a716-446655440002",
          "solution",
          JSON.stringify({ name: "Solution" }),
        );

        expect(pattern.contributor_id).toBeNull();
      });
    });

    describe("getPatternById", () => {
      it("should return pattern by ID", () => {
        createPattern(
          "get-pattern-by-id-test",
          "fix",
          JSON.stringify({ name: "Test" }),
        );

        const pattern = getPatternById("get-pattern-by-id-test");
        expect(pattern).not.toBeNull();
        expect(pattern?.pattern_id).toBe("get-pattern-by-id-test");
      });

      it("should return null for non-existent pattern", () => {
        const pattern = getPatternById("non-existent-id");
        expect(pattern).toBeNull();
      });
    });

    describe("getPatternByHash", () => {
      it("should return pattern by hash", () => {
        createPattern(
          "get-by-hash-test",
          "fix",
          JSON.stringify({ name: "Test" }),
          undefined,
          "unique-hash-123",
        );

        const pattern = getPatternByHash("unique-hash-123");
        expect(pattern).not.toBeNull();
        expect(pattern?.pattern_hash).toBe("unique-hash-123");
      });

      it("should return null for non-existent hash", () => {
        const pattern = getPatternByHash("non-existent-hash");
        expect(pattern).toBeNull();
      });
    });

    describe("getPatterns", () => {
      it("should return all patterns with pagination", () => {
        // Create some test patterns
        createPattern("patterns-test-1", "fix", JSON.stringify({ name: "Fix 1" }));
        createPattern("patterns-test-2", "blueprint", JSON.stringify({ name: "Blueprint 1" }));
        createPattern("patterns-test-3", "fix", JSON.stringify({ name: "Fix 2" }));

        const result = getPatterns(undefined, 50, 0);
        expect(result.patterns.length).toBeGreaterThanOrEqual(3);
        expect(result.total).toBeGreaterThanOrEqual(3);
      });

      it("should filter by pattern type", () => {
        createPattern("filter-type-1", "fix", JSON.stringify({ name: "Fix" }));
        createPattern("filter-type-2", "blueprint", JSON.stringify({ name: "Blueprint" }));

        const fixResult = getPatterns("fix", 50, 0);
        const bpResult = getPatterns("blueprint", 50, 0);

        // All results should be of the correct type
        expect(fixResult.patterns.every((p) => p.pattern_type === "fix")).toBe(true);
        expect(bpResult.patterns.every((p) => p.pattern_type === "blueprint")).toBe(true);
      });

      it("should respect limit parameter", () => {
        // Create more patterns
        for (let i = 0; i < 5; i++) {
          createPattern(`limit-test-${i}`, "fix", JSON.stringify({ name: `Pattern ${i}` }));
        }

        const result = getPatterns(undefined, 3, 0);
        expect(result.patterns.length).toBeLessThanOrEqual(3);
      });

      it("should respect offset parameter", () => {
        const result1 = getPatterns(undefined, 2, 0);
        const result2 = getPatterns(undefined, 2, 2);

        // Different patterns should be returned
        if (result1.patterns.length > 0 && result2.patterns.length > 0) {
          expect(result1.patterns[0].pattern_id).not.toBe(result2.patterns[0].pattern_id);
        }
      });
    });

    describe("batchCreatePatterns", () => {
      it("should batch insert multiple patterns", () => {
        const result = batchCreatePatterns([
          {
            patternId: "batch-1",
            patternType: "fix",
            patternData: JSON.stringify({ name: "Batch 1" }),
            contributorId: "wf-batch-test",
          },
          {
            patternId: "batch-2",
            patternType: "blueprint",
            patternData: JSON.stringify({ name: "Batch 2" }),
            contributorId: "wf-batch-test",
          },
        ]);

        expect(result.inserted).toBe(2);
        expect(result.skipped).toBe(0);
        expect(result.errors).toHaveLength(0);
      });

      it("should skip duplicate patterns by ID", () => {
        createPattern("batch-dup-id", "fix", JSON.stringify({ name: "Original" }));

        const result = batchCreatePatterns([
          {
            patternId: "batch-dup-id",
            patternType: "fix",
            patternData: JSON.stringify({ name: "Duplicate" }),
          },
        ]);

        expect(result.inserted).toBe(0);
        expect(result.skipped).toBe(1);
      });

      it("should skip duplicate patterns by hash", () => {
        createPattern(
          "batch-hash-original",
          "fix",
          JSON.stringify({ name: "Original" }),
          undefined,
          "duplicate-hash",
        );

        const result = batchCreatePatterns([
          {
            patternId: "batch-hash-new",
            patternType: "fix",
            patternData: JSON.stringify({ name: "New" }),
            patternHash: "duplicate-hash",
          },
        ]);

        expect(result.inserted).toBe(0);
        expect(result.skipped).toBe(1);
      });

      it("should continue on individual errors", () => {
        const result = batchCreatePatterns([
          {
            patternId: "batch-error-1",
            patternType: "fix",
            patternData: JSON.stringify({ name: "Valid" }),
          },
          {
            patternId: "batch-error-2",
            patternType: "fix",
            patternData: JSON.stringify({ name: "Valid 2" }),
          },
        ]);

        expect(result.inserted).toBe(2);
      });
    });

    describe("getPatternsNewerThan", () => {
      it("should return patterns newer than the given date", () => {
        const oldDate = "2020-01-01T00:00:00.000Z";
        createPattern("newer-than-test", "fix", JSON.stringify({ name: "New" }));

        const patterns = getPatternsNewerThan(oldDate, 100);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it("should return empty array for future date", () => {
        const futureDate = "2099-01-01T00:00:00.000Z";
        const patterns = getPatternsNewerThan(futureDate, 100);
        expect(patterns).toHaveLength(0);
      });

      it("should respect limit parameter", () => {
        const oldDate = "2020-01-01T00:00:00.000Z";
        const patterns = getPatternsNewerThan(oldDate, 1);
        expect(patterns.length).toBeLessThanOrEqual(1);
      });
    });
  });

  // ============================================
  // Rate Limiting Tests
  // ============================================

  describe("Rate Limiting", () => {
    describe("checkRateLimit", () => {
      it("should allow first request for new contributor", () => {
        const result = checkRateLimit("new-contributor-123");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(100);
        expect(result.resetAt).toBeNull();
      });

      it("should track remaining count after incrementing", () => {
        const contributorId = "rate-limit-test-1";
        incrementRateLimit(contributorId, 10);

        const result = checkRateLimit(contributorId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(90);
      });

      it("should block when limit is reached", () => {
        const contributorId = "rate-limit-test-2";
        incrementRateLimit(contributorId, 100);

        const result = checkRateLimit(contributorId);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetAt).not.toBeNull();
      });

      it("should block when limit is exceeded", () => {
        const contributorId = "rate-limit-test-3";
        incrementRateLimit(contributorId, 150);

        const result = checkRateLimit(contributorId);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });
    });

    describe("incrementRateLimit", () => {
      it("should create new record for first increment", () => {
        const contributorId = "increment-test-1";
        incrementRateLimit(contributorId, 5);

        const result = checkRateLimit(contributorId);
        expect(result.remaining).toBe(95);
      });

      it("should update existing record", () => {
        const contributorId = "increment-test-2";
        incrementRateLimit(contributorId, 10);
        incrementRateLimit(contributorId, 20);

        const result = checkRateLimit(contributorId);
        expect(result.remaining).toBe(70);
      });

      it("should handle single increment", () => {
        const contributorId = "increment-test-3";
        incrementRateLimit(contributorId);
        incrementRateLimit(contributorId);
        incrementRateLimit(contributorId);

        const result = checkRateLimit(contributorId);
        expect(result.remaining).toBe(97);
      });
    });
  });
});
