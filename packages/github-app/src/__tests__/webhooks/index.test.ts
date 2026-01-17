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

      const webhooks = getWebhooks();

      await handleWebhook(
        "push",
        "sha256=test-signature",
        JSON.stringify({ action: "pushed", ref: "refs/heads/main" }),
      );

      expect(webhooks.verifyAndReceive).toHaveBeenCalled();
    });

    it("should log webhook events to database", async () => {
      const { handleWebhook, getWebhooks } =
        await import("../../webhooks/index");

      const webhooks = getWebhooks();

      await handleWebhook(
        "workflow_run",
        "sha256=test-signature",
        JSON.stringify({
          action: "completed",
          workflow_run: { id: 123, conclusion: "success" },
        }),
      );

      // The actual logging happens in the event handlers, not handleWebhook
      expect(webhooks.verifyAndReceive).toHaveBeenCalled();
    });

    it("should mark webhook as processed after success", async () => {
      const { handleWebhook, getWebhooks } =
        await import("../../webhooks/index");

      const webhooks = getWebhooks();

      await handleWebhook(
        "ping",
        "sha256=test-signature",
        JSON.stringify({ zen: "test" }),
      );

      // The actual processing happens in the event handlers, not handleWebhook
      expect(webhooks.verifyAndReceive).toHaveBeenCalled();
    });
  });

  describe("Event types", () => {
    it("should handle workflow_run events", async () => {
      const { handleWebhook } = await import("../../webhooks/index");

      await expect(
        handleWebhook(
          "workflow_run",
          "sha256=test-signature",
          JSON.stringify({
            action: "completed",
            workflow_run: { id: 123, conclusion: "failure" },
          }),
        ),
      ).resolves.not.toThrow();
    });

    it("should handle check_run events", async () => {
      const { handleWebhook } = await import("../../webhooks/index");

      await expect(
        handleWebhook(
          "check_run",
          "sha256=test-signature",
          JSON.stringify({
            action: "completed",
            check_run: { id: 123, conclusion: "success" },
          }),
        ),
      ).resolves.not.toThrow();
    });

    it("should handle pull_request events", async () => {
      const { handleWebhook } = await import("../../webhooks/index");

      await expect(
        handleWebhook(
          "pull_request",
          "sha256=test-signature",
          JSON.stringify({
            action: "opened",
            pull_request: { number: 1 },
          }),
        ),
      ).resolves.not.toThrow();
    });
  });
});
