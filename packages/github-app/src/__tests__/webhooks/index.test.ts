/**
 * Unit tests for webhook handlers
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Create mock webhooks instance
const mockWebhooksInstance = {
  on: vi.fn(),
  onAny: vi.fn(),
  verifyAndReceive: vi.fn(() => Promise.resolve()),
  receive: vi.fn(() => Promise.resolve()),
};

// Mock dependencies
vi.mock("@octokit/webhooks", () => ({
  Webhooks: vi.fn(() => mockWebhooksInstance),
}));

vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    GITHUB_WEBHOOK_SECRET: "test-secret",
    MAX_RETRIES: 3,
  })),
}));

vi.mock("../../db/queries", () => ({
  logWebhookEvent: vi.fn(() => ({ id: 1 })),
  markWebhookProcessed: vi.fn(),
  getOrCreateRetryAttempt: vi.fn(() => ({
    id: 1,
    commit_sha: "abc123",
    attempt_count: 0,
    status: "pending",
  })),
  updateRetryAttempt: vi.fn(),
}));

vi.mock("../../webhooks/workflow-run", () => ({
  handleWorkflowRunCompleted: vi.fn(() => Promise.resolve()),
}));

describe("Webhook Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getWebhooks", () => {
    it("should create a webhooks handler instance", async () => {
      const { getWebhooks } = await import("../../webhooks/index");
      const webhooks = getWebhooks();

      expect(webhooks).toBeDefined();
    });

    it("should return the same instance on multiple calls", async () => {
      const { getWebhooks } = await import("../../webhooks/index");

      const webhooks1 = getWebhooks();
      const webhooks2 = getWebhooks();

      expect(webhooks1).toBe(webhooks2);
    });
  });

  describe("handleWebhook", () => {
    it("should process webhook events", async () => {
      const { handleWebhook, getWebhooks } =
        await import("../../webhooks/index");
      const queries = await import("../../db/queries");

      const webhooks = getWebhooks();

      await handleWebhook({
        id: "test-id",
        name: "push",
        signature: "sha256=test-signature",
        payload: JSON.stringify({ action: "pushed", ref: "refs/heads/main" }),
      });

      expect(queries.logWebhookEvent).toHaveBeenCalled();
      expect(webhooks.verifyAndReceive).toHaveBeenCalled();
    });

    it("should log webhook events to database", async () => {
      const { handleWebhook } = await import("../../webhooks/index");
      const queries = await import("../../db/queries");

      await handleWebhook({
        id: "test-id",
        name: "workflow_run",
        signature: "sha256=test-signature",
        payload: JSON.stringify({
          action: "completed",
          workflow_run: { id: 123, conclusion: "success" },
        }),
      });

      expect(queries.logWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "workflow_run",
          action: "completed",
        }),
      );
    });

    it("should mark webhook as processed after success", async () => {
      const { handleWebhook } = await import("../../webhooks/index");
      const queries = await import("../../db/queries");

      await handleWebhook({
        id: "test-id",
        name: "ping",
        signature: "sha256=test-signature",
        payload: JSON.stringify({ zen: "test" }),
      });

      expect(queries.markWebhookProcessed).toHaveBeenCalled();
    });
  });

  describe("Event types", () => {
    it("should handle workflow_run events", async () => {
      const { handleWebhook } = await import("../../webhooks/index");

      await expect(
        handleWebhook({
          id: "test-id",
          name: "workflow_run",
          signature: "sha256=test-signature",
          payload: JSON.stringify({
            action: "completed",
            workflow_run: { id: 123, conclusion: "failure" },
          }),
        }),
      ).resolves.not.toThrow();
    });

    it("should handle check_run events", async () => {
      const { handleWebhook } = await import("../../webhooks/index");

      await expect(
        handleWebhook({
          id: "test-id",
          name: "check_run",
          signature: "sha256=test-signature",
          payload: JSON.stringify({
            action: "completed",
            check_run: { id: 123, conclusion: "success" },
          }),
        }),
      ).resolves.not.toThrow();
    });

    it("should handle pull_request events", async () => {
      const { handleWebhook } = await import("../../webhooks/index");

      await expect(
        handleWebhook({
          id: "test-id",
          name: "pull_request",
          signature: "sha256=test-signature",
          payload: JSON.stringify({
            action: "opened",
            pull_request: { number: 1 },
          }),
        }),
      ).resolves.not.toThrow();
    });
  });
});
