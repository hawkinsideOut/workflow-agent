import * as fs from "node:fs";
import * as path from "node:path";
import {
  TelemetryEventSchema,
  TELEMETRY_BATCH_SIZE,
  PATTERNS_DIR,
  type TelemetryEvent,
  type TelemetryEventType,
  type PatternType,
} from "./patterns-schema";
import { ContributorManager } from "./contributor";

// ============================================
// Constants
// ============================================

/** File name for pending telemetry events */
const TELEMETRY_FILE = "telemetry-queue.json";

/** Maximum events to keep in queue */
const MAX_QUEUE_SIZE = 100;

// ============================================
// Types
// ============================================

/** Telemetry queue stored on disk */
export interface TelemetryQueue {
  events: TelemetryEvent[];
  lastFlushAt?: string;
  totalEventsSent: number;
}

/** Result of telemetry operations */
export interface TelemetryResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Callback for sending telemetry to remote */
export type TelemetrySender = (
  events: TelemetryEvent[],
) => Promise<{ success: boolean; error?: string }>;

// ============================================
// TelemetryCollector Class
// ============================================

/**
 * Collects and batches anonymized telemetry events.
 * Events are stored locally and sent in batches when threshold is reached.
 */
export class TelemetryCollector {
  private readonly queuePath: string;
  private readonly contributorManager: ContributorManager;
  private sender?: TelemetrySender;
  private cache: TelemetryQueue | null = null;

  constructor(workspacePath: string, sender?: TelemetrySender) {
    this.queuePath = path.join(workspacePath, PATTERNS_DIR, TELEMETRY_FILE);
    this.contributorManager = new ContributorManager(workspacePath);
    this.sender = sender;
  }

  // ============================================
  // Event Recording
  // ============================================

  /**
   * Record a pattern application event
   */
  async recordApplication(
    patternId: string,
    patternType: PatternType,
    framework: string,
    frameworkVersion: string,
    runtime?: string,
    runtimeVersion?: string,
  ): Promise<TelemetryResult<TelemetryEvent>> {
    return this.recordEvent({
      type: "pattern-applied",
      patternId,
      patternType,
      framework,
      frameworkVersion,
      runtime,
      runtimeVersion,
    });
  }

  /**
   * Record a pattern success event
   */
  async recordSuccess(
    patternId: string,
    patternType: PatternType,
    framework: string,
    frameworkVersion: string,
    runtime?: string,
    runtimeVersion?: string,
  ): Promise<TelemetryResult<TelemetryEvent>> {
    return this.recordEvent({
      type: "pattern-success",
      patternId,
      patternType,
      framework,
      frameworkVersion,
      runtime,
      runtimeVersion,
      success: true,
    });
  }

  /**
   * Record a pattern failure event
   */
  async recordFailure(
    patternId: string,
    patternType: PatternType,
    framework: string,
    frameworkVersion: string,
    failureReason: TelemetryEvent["failureReason"],
    runtime?: string,
    runtimeVersion?: string,
  ): Promise<TelemetryResult<TelemetryEvent>> {
    return this.recordEvent({
      type: "pattern-failure",
      patternId,
      patternType,
      framework,
      frameworkVersion,
      runtime,
      runtimeVersion,
      success: false,
      failureReason,
    });
  }

  /**
   * Record a generic telemetry event
   */
  private async recordEvent(
    eventData: Omit<TelemetryEvent, "id" | "contributorId" | "timestamp">,
  ): Promise<TelemetryResult<TelemetryEvent>> {
    try {
      // Check if telemetry is enabled
      const telemetryEnabled =
        await this.contributorManager.isTelemetryEnabled();
      if (!telemetryEnabled) {
        return { success: false, error: "Telemetry is disabled" };
      }

      // Get contributor ID
      const contributorResult = await this.contributorManager.getOrCreateId();
      if (!contributorResult.success || !contributorResult.data) {
        return {
          success: false,
          error: "Could not get contributor ID",
        };
      }

      // Create event
      const event: TelemetryEvent = {
        id: crypto.randomUUID(),
        contributorId: contributorResult.data,
        timestamp: new Date().toISOString(),
        ...eventData,
      };

      // Validate event
      const validation = TelemetryEventSchema.safeParse(event);
      if (!validation.success) {
        return {
          success: false,
          error: `Invalid event: ${validation.error.message}`,
        };
      }

      // Add to queue
      const queue = await this.getQueue();
      queue.events.push(event);

      // Trim queue if too large
      if (queue.events.length > MAX_QUEUE_SIZE) {
        queue.events = queue.events.slice(-MAX_QUEUE_SIZE);
      }

      await this.saveQueue(queue);

      // Check if we should flush
      if (queue.events.length >= TELEMETRY_BATCH_SIZE) {
        await this.flush();
      }

      return { success: true, data: event };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Get the current telemetry queue
   */
  async getQueue(): Promise<TelemetryQueue> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const content = await fs.promises.readFile(this.queuePath, "utf-8");
      const queue = JSON.parse(content) as TelemetryQueue;
      this.cache = queue;
      return queue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { events: [], totalEventsSent: 0 };
      }
      throw error;
    }
  }

  /**
   * Save the telemetry queue
   */
  private async saveQueue(queue: TelemetryQueue): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.queuePath), { recursive: true });
    await fs.promises.writeFile(this.queuePath, JSON.stringify(queue, null, 2));
    this.cache = queue;
  }

  /**
   * Get the number of pending events
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.events.length;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pendingEvents: number;
    totalEventsSent: number;
    lastFlushAt?: string;
  }> {
    const queue = await this.getQueue();
    return {
      pendingEvents: queue.events.length,
      totalEventsSent: queue.totalEventsSent,
      lastFlushAt: queue.lastFlushAt,
    };
  }

  // ============================================
  // Flush and Send
  // ============================================

  /**
   * Flush pending events to the remote service
   */
  async flush(): Promise<TelemetryResult<number>> {
    try {
      const queue = await this.getQueue();

      if (queue.events.length === 0) {
        return { success: true, data: 0 };
      }

      // If no sender configured, just return
      if (!this.sender) {
        return {
          success: false,
          error: "No telemetry sender configured",
        };
      }

      // Send events
      const result = await this.sender(queue.events);

      if (result.success) {
        const sentCount = queue.events.length;
        queue.totalEventsSent += sentCount;
        queue.events = [];
        queue.lastFlushAt = new Date().toISOString();
        await this.saveQueue(queue);

        return { success: true, data: sentCount };
      } else {
        return {
          success: false,
          error: result.error || "Failed to send telemetry",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Force flush all events regardless of batch size
   */
  async forceFlush(): Promise<TelemetryResult<number>> {
    return this.flush();
  }

  /**
   * Clear all pending events without sending
   */
  async clear(): Promise<TelemetryResult> {
    try {
      const queue = await this.getQueue();
      queue.events = [];
      await this.saveQueue(queue);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Set the telemetry sender function
   */
  setSender(sender: TelemetrySender): void {
    this.sender = sender;
  }

  /**
   * Check if a sender is configured
   */
  hasSender(): boolean {
    return this.sender !== undefined;
  }

  /**
   * Clear the queue cache
   */
  clearCache(): void {
    this.cache = null;
  }

  // ============================================
  // Event Aggregation
  // ============================================

  /**
   * Get aggregated stats for a specific pattern
   */
  async getPatternStats(patternId: string): Promise<{
    applications: number;
    successes: number;
    failures: number;
    failureReasons: Record<string, number>;
  }> {
    const queue = await this.getQueue();
    const patternEvents = queue.events.filter(
      (e) => e.patternId === patternId,
    );

    const failureReasons: Record<string, number> = {};

    let applications = 0;
    let successes = 0;
    let failures = 0;

    for (const event of patternEvents) {
      if (event.type === "pattern-applied") {
        applications++;
      } else if (event.type === "pattern-success") {
        successes++;
      } else if (event.type === "pattern-failure") {
        failures++;
        if (event.failureReason) {
          failureReasons[event.failureReason] =
            (failureReasons[event.failureReason] || 0) + 1;
        }
      }
    }

    return { applications, successes, failures, failureReasons };
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    type: TelemetryEventType,
  ): Promise<TelemetryEvent[]> {
    const queue = await this.getQueue();
    return queue.events.filter((e) => e.type === type);
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new telemetry collector for a workspace
 */
export function createTelemetryCollector(
  workspacePath: string,
  sender?: TelemetrySender,
): TelemetryCollector {
  return new TelemetryCollector(workspacePath, sender);
}

// ============================================
// Mock Sender for Testing
// ============================================

/**
 * Create a mock sender that stores events in memory
 */
export function createMockSender(): {
  sender: TelemetrySender;
  getSentEvents: () => TelemetryEvent[];
  clear: () => void;
} {
  const sentEvents: TelemetryEvent[] = [];

  return {
    sender: async (events) => {
      sentEvents.push(...events);
      return { success: true };
    },
    getSentEvents: () => sentEvents,
    clear: () => {
      sentEvents.length = 0;
    },
  };
}
