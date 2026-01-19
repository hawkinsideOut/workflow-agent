import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  TelemetryCollector,
  createTelemetryCollector,
  createMockSender,
} from "./telemetry";
import { ContributorManager } from "./contributor";
import { PATTERNS_DIR, TELEMETRY_BATCH_SIZE } from "./patterns-schema";

// ============================================
// Test Constants
// ============================================

const TEST_WORKSPACE = "/tmp/telemetry-test";
const TEST_PATTERN_ID = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID for testing

// ============================================
// Test Setup
// ============================================

describe("TelemetryCollector", () => {
  let collector: TelemetryCollector;
  let contributorManager: ContributorManager;

  beforeEach(async () => {
    // Clean up and create test directory
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // OK
    }
    await fs.promises.mkdir(TEST_WORKSPACE, { recursive: true });

    // Create contributor manager and enable telemetry
    contributorManager = new ContributorManager(TEST_WORKSPACE);
    await contributorManager.enableTelemetry();

    collector = createTelemetryCollector(TEST_WORKSPACE);
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // OK
    }
  });

  // ============================================
  // Recording Events Tests
  // ============================================

  describe("recordApplication", () => {
    it("should record an application event", async () => {
      const result = await collector.recordApplication(
        TEST_PATTERN_ID,
        "fix",
        "next",
        "14.0.0",
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.type).toBe("pattern-applied");
      expect(result.data?.patternId).toBe(TEST_PATTERN_ID);
      expect(result.data?.patternType).toBe("fix");
      expect(result.data?.framework).toBe("next");
    });

    it("should include runtime info when provided", async () => {
      const result = await collector.recordApplication(
        TEST_PATTERN_ID,
        "fix",
        "next",
        "14.0.0",
        "node",
        "20.0.0",
      );

      expect(result.success).toBe(true);
      expect(result.data?.runtime).toBe("node");
      expect(result.data?.runtimeVersion).toBe("20.0.0");
    });

    it("should fail when telemetry is disabled", async () => {
      await contributorManager.disableTelemetry();

      const result = await collector.recordApplication(
        TEST_PATTERN_ID,
        "fix",
        "next",
        "14.0.0",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Telemetry is disabled");
    });
  });

  describe("recordSuccess", () => {
    it("should record a success event", async () => {
      const result = await collector.recordSuccess(
        TEST_PATTERN_ID,
        "fix",
        "react",
        "18.2.0",
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("pattern-success");
      expect(result.data?.success).toBe(true);
    });
  });

  describe("recordFailure", () => {
    it("should record a failure event with reason", async () => {
      const result = await collector.recordFailure(
        TEST_PATTERN_ID,
        "fix",
        "vue",
        "3.0.0",
        "version-mismatch",
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("pattern-failure");
      expect(result.data?.success).toBe(false);
      expect(result.data?.failureReason).toBe("version-mismatch");
    });

    it("should accept all valid failure reasons", async () => {
      const reasons = [
        "version-mismatch",
        "missing-dependency",
        "file-conflict",
        "permission-error",
        "syntax-error",
        "unknown",
      ] as const;

      for (const reason of reasons) {
        const result = await collector.recordFailure(
          crypto.randomUUID(),
          "blueprint",
          "next",
          "14.0.0",
          reason,
        );
        expect(result.success).toBe(true);
        expect(result.data?.failureReason).toBe(reason);
      }
    });
  });

  // ============================================
  // Queue Management Tests
  // ============================================

  describe("getQueue", () => {
    it("should return empty queue when no events", async () => {
      const queue = await collector.getQueue();

      expect(queue.events).toEqual([]);
      expect(queue.totalEventsSent).toBe(0);
    });

    it("should return queue with recorded events", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordSuccess(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );

      const queue = await collector.getQueue();

      expect(queue.events.length).toBe(2);
    });
  });

  describe("getPendingCount", () => {
    it("should return 0 when no pending events", async () => {
      const count = await collector.getPendingCount();
      expect(count).toBe(0);
    });

    it("should return correct count after recording events", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440002",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440003",
        "fix",
        "next",
        "14.0.0",
      );

      const count = await collector.getPendingCount();
      expect(count).toBe(3);
    });
  });

  describe("getStats", () => {
    it("should return initial stats", async () => {
      const stats = await collector.getStats();

      expect(stats.pendingEvents).toBe(0);
      expect(stats.totalEventsSent).toBe(0);
      expect(stats.lastFlushAt).toBeUndefined();
    });

    it("should update stats after flush", async () => {
      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440002",
        "fix",
        "next",
        "14.0.0",
      );

      await collector.flush();

      const stats = await collector.getStats();
      expect(stats.pendingEvents).toBe(0);
      expect(stats.totalEventsSent).toBe(2);
      expect(stats.lastFlushAt).toBeDefined();
    });
  });

  // ============================================
  // Flush Tests
  // ============================================

  describe("flush", () => {
    it("should succeed with 0 events when queue is empty", async () => {
      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      const result = await collector.flush();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it("should fail when no sender is configured", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );

      const result = await collector.flush();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No telemetry sender configured");
    });

    it("should send all pending events", async () => {
      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordSuccess(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );

      const result = await collector.flush();

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(mockSender.getSentEvents().length).toBe(2);
    });

    it("should clear queue after successful flush", async () => {
      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.flush();

      const count = await collector.getPendingCount();
      expect(count).toBe(0);
    });

    it("should not clear queue on send failure", async () => {
      collector.setSender(async () => ({
        success: false,
        error: "Network error",
      }));

      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      const result = await collector.flush();

      expect(result.success).toBe(false);

      const count = await collector.getPendingCount();
      expect(count).toBe(1);
    });
  });

  describe("auto-flush", () => {
    it("should auto-flush when batch size is reached", async () => {
      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      // Record TELEMETRY_BATCH_SIZE events
      for (let i = 0; i < TELEMETRY_BATCH_SIZE; i++) {
        await collector.recordApplication(
          crypto.randomUUID(),
          "fix",
          "next",
          "14.0.0",
        );
      }

      // Queue should be flushed
      expect(mockSender.getSentEvents().length).toBe(TELEMETRY_BATCH_SIZE);

      const count = await collector.getPendingCount();
      expect(count).toBe(0);
    });
  });

  describe("forceFlush", () => {
    it("should flush regardless of batch size", async () => {
      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      await collector.recordApplication(
        TEST_PATTERN_ID,
        "fix",
        "next",
        "14.0.0",
      );

      const result = await collector.forceFlush();

      expect(result.success).toBe(true);
      expect(mockSender.getSentEvents().length).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear all pending events", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440002",
        "fix",
        "next",
        "14.0.0",
      );

      const result = await collector.clear();

      expect(result.success).toBe(true);

      const count = await collector.getPendingCount();
      expect(count).toBe(0);
    });
  });

  // ============================================
  // Configuration Tests
  // ============================================

  describe("setSender", () => {
    it("should set the sender function", () => {
      expect(collector.hasSender()).toBe(false);

      const mockSender = createMockSender();
      collector.setSender(mockSender.sender);

      expect(collector.hasSender()).toBe(true);
    });
  });

  describe("clearCache", () => {
    it("should clear the internal cache", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );

      // This populates cache
      await collector.getQueue();

      collector.clearCache();

      // Should still work (reads from disk)
      const queue = await collector.getQueue();
      expect(queue.events.length).toBe(1);
    });
  });

  // ============================================
  // Event Aggregation Tests
  // ============================================

  describe("getPatternStats", () => {
    it("should return stats for a specific pattern", async () => {
      const patternId = TEST_PATTERN_ID;

      await collector.recordApplication(patternId, "fix", "next", "14.0.0");
      await collector.recordSuccess(patternId, "fix", "next", "14.0.0");
      await collector.recordSuccess(patternId, "fix", "next", "14.0.0");
      await collector.recordFailure(
        patternId,
        "fix",
        "next",
        "14.0.0",
        "version-mismatch",
      );

      const stats = await collector.getPatternStats(patternId);

      expect(stats.applications).toBe(1);
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.failureReasons["version-mismatch"]).toBe(1);
    });

    it("should return empty stats for unknown pattern", async () => {
      const stats = await collector.getPatternStats("unknown-pattern");

      expect(stats.applications).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.failures).toBe(0);
      expect(Object.keys(stats.failureReasons).length).toBe(0);
    });

    it("should count multiple failure reasons", async () => {
      const patternId = crypto.randomUUID();

      await collector.recordFailure(
        patternId,
        "fix",
        "next",
        "14.0.0",
        "version-mismatch",
      );
      await collector.recordFailure(
        patternId,
        "fix",
        "next",
        "14.0.0",
        "version-mismatch",
      );
      await collector.recordFailure(
        patternId,
        "fix",
        "next",
        "14.0.0",
        "missing-dependency",
      );

      const stats = await collector.getPatternStats(patternId);

      expect(stats.failureReasons["version-mismatch"]).toBe(2);
      expect(stats.failureReasons["missing-dependency"]).toBe(1);
    });
  });

  describe("getEventsByType", () => {
    it("should filter events by type", async () => {
      const p1 = crypto.randomUUID();
      const p2 = crypto.randomUUID();
      await collector.recordApplication(p1, "fix", "next", "14.0.0");
      await collector.recordSuccess(p1, "fix", "next", "14.0.0");
      await collector.recordFailure(p2, "fix", "next", "14.0.0", "unknown");

      const applied = await collector.getEventsByType("pattern-applied");
      const succeeded = await collector.getEventsByType("pattern-success");
      const failed = await collector.getEventsByType("pattern-failure");

      expect(applied.length).toBe(1);
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);
    });
  });

  // ============================================
  // Persistence Tests
  // ============================================

  describe("persistence", () => {
    it("should persist events to disk", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );

      const filePath = path.join(
        TEST_WORKSPACE,
        PATTERNS_DIR,
        "telemetry-queue.json",
      );
      const content = await fs.promises.readFile(filePath, "utf-8");
      const queue = JSON.parse(content);

      expect(queue.events.length).toBe(1);
    });

    it("should survive collector recreation", async () => {
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440001",
        "fix",
        "next",
        "14.0.0",
      );
      await collector.recordApplication(
        "550e8400-e29b-41d4-a716-446655440002",
        "fix",
        "next",
        "14.0.0",
      );

      // Create new collector
      const newCollector = createTelemetryCollector(TEST_WORKSPACE);

      const count = await newCollector.getPendingCount();
      expect(count).toBe(2);
    });
  });

  // ============================================
  // Queue Trimming Tests
  // ============================================

  describe("queue trimming", () => {
    it("should trim queue when exceeding max size", async () => {
      // Record more than MAX_QUEUE_SIZE (100) events
      // We need to prevent auto-flush, so don't set a sender
      // Track the last UUID so we can verify it's kept
      let lastPatternId = "";
      for (let i = 0; i < 110; i++) {
        lastPatternId = crypto.randomUUID();
        await collector.recordApplication(
          lastPatternId,
          "fix",
          "next",
          "14.0.0",
        );
      }

      const queue = await collector.getQueue();
      expect(queue.events.length).toBeLessThanOrEqual(100);

      // Verify we kept the most recent events
      const lastEvent = queue.events[queue.events.length - 1];
      expect(lastEvent.patternId).toBe(lastPatternId);
    });
  });
});

// ============================================
// Mock Sender Tests
// ============================================

describe("createMockSender", () => {
  it("should create a working mock sender", () => {
    const mock = createMockSender();

    expect(mock.sender).toBeDefined();
    expect(mock.getSentEvents).toBeDefined();
    expect(mock.clear).toBeDefined();
  });

  it("should store sent events", async () => {
    const mock = createMockSender();
    const testPatternId = crypto.randomUUID();

    const events = [
      {
        id: crypto.randomUUID(),
        type: "pattern-applied" as const,
        patternId: testPatternId,
        patternType: "fix" as const,
        contributorId: "wf-test",
        framework: "next",
        frameworkVersion: "14.0.0",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = await mock.sender(events);

    expect(result.success).toBe(true);
    expect(mock.getSentEvents()).toEqual(events);
  });

  it("should clear stored events", async () => {
    const mock = createMockSender();
    const testPatternId = crypto.randomUUID();

    await mock.sender([
      {
        id: crypto.randomUUID(),
        type: "pattern-applied" as const,
        patternId: testPatternId,
        patternType: "fix" as const,
        contributorId: "wf-test",
        framework: "next",
        frameworkVersion: "14.0.0",
        timestamp: new Date().toISOString(),
      },
    ]);

    mock.clear();

    expect(mock.getSentEvents()).toEqual([]);
  });
});

// ============================================
// Factory Function Tests
// ============================================

describe("createTelemetryCollector", () => {
  it("should create a TelemetryCollector instance", () => {
    const collector = createTelemetryCollector(TEST_WORKSPACE);
    expect(collector).toBeInstanceOf(TelemetryCollector);
  });

  it("should accept a sender parameter", () => {
    const mockSender = createMockSender();
    const collector = createTelemetryCollector(
      TEST_WORKSPACE,
      mockSender.sender,
    );
    expect(collector.hasSender()).toBe(true);
  });
});
