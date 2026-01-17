/**
 * Unit tests for orchestrator auto-heal module
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn((event, cb) => {
        if (event === "data") cb(Buffer.from("stdout output"));
      }),
    },
    stderr: {
      on: vi.fn((event, cb) => {
        if (event === "data") cb(Buffer.from(""));
      }),
    },
    on: vi.fn((event, cb) => {
      if (event === "close") setTimeout(() => cb(0), 10);
    }),
  })),
  exec: vi.fn((_cmd, cb) => cb(null, "output", "")),
}));

// Mock GitHub client
vi.mock("../../github/client", () => ({
  getInstallationOctokit: vi.fn(() =>
    Promise.resolve({
      actions: {
        reRunWorkflow: vi.fn(() => Promise.resolve({ data: {} })),
        listJobsForWorkflowRun: vi.fn(() =>
          Promise.resolve({
            data: {
              jobs: [
                {
                  id: 1,
                  name: "build",
                  conclusion: "failure",
                  steps: [{ name: "npm install", conclusion: "failure" }],
                },
              ],
            },
          }),
        ),
        downloadWorkflowRunLogs: vi.fn(() =>
          Promise.resolve({
            data: Buffer.from("Error: Module not found"),
          }),
        ),
      },
      repos: {
        getContent: vi.fn(() =>
          Promise.resolve({
            data: { content: Buffer.from("file content").toString("base64") },
          }),
        ),
      },
      pulls: {
        create: vi.fn(() =>
          Promise.resolve({
            data: {
              number: 1,
              html_url: "https://github.com/owner/repo/pull/1",
            },
          }),
        ),
      },
    }),
  ),
  getWorkflowRunLogs: vi.fn(() => Promise.resolve("Error: Module not found")),
  getFailedWorkflowDetails: vi.fn(() =>
    Promise.resolve({
      workflowRun: { id: 123, name: "CI" },
      failedJobs: [{ id: 1, name: "build", conclusion: "failure", steps: [] }],
    }),
  ),
}));

// Mock database queries
vi.mock("../../db/queries", () => ({
  getOrCreateRetryAttempt: vi.fn(() => ({
    id: 1,
    commit_sha: "abc123",
    attempt_count: 0,
    status: "pending",
  })),
  updateRetryAttempt: vi.fn(),
  recordAutoHealHistory: vi.fn(() => ({ id: 1 })),
}));

// Mock config
vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    MAX_RETRIES: 3,
    NODE_ENV: "test",
  })),
}));

// Mock LLM
vi.mock("../../llm/index", () => ({
  suggestFix: vi.fn(() =>
    Promise.resolve({
      analysis: "Missing dependency detected",
      suggestedFix: "npm install missing-package",
      files: [{ path: "package.json", changes: "add missing-package" }],
    }),
  ),
}));

describe("Auto-Heal Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("triggerAutoHeal", () => {
    it("should trigger auto-heal for failed workflows", async () => {
      const { triggerAutoHeal } = await import("../../orchestrator/auto-heal");
      const queries = await import("../../db/queries");

      await triggerAutoHeal({
        workflowRunId: 12345,
        repoOwner: "owner",
        repoName: "repo",
        commitSha: "abc123",
        installationId: 12345,
        failedJobs: [
          { id: 1, name: "build", conclusion: "failure", steps: [] },
        ],
        workflowName: "CI",
      });

      expect(queries.recordAutoHealHistory).toHaveBeenCalled();
    });

    it("should get retry attempt from database", async () => {
      const { triggerAutoHeal } = await import("../../orchestrator/auto-heal");
      const queries = await import("../../db/queries");

      await triggerAutoHeal({
        workflowRunId: 12345,
        repoOwner: "owner",
        repoName: "repo",
        commitSha: "abc123",
        installationId: 12345,
        failedJobs: [],
        workflowName: "CI",
      });

      expect(queries.getOrCreateRetryAttempt).toHaveBeenCalledWith(
        "abc123",
        "owner",
        "repo",
      );
    });

    it("should update retry attempt count", async () => {
      const { triggerAutoHeal } = await import("../../orchestrator/auto-heal");
      const queries = await import("../../db/queries");

      await triggerAutoHeal({
        workflowRunId: 12345,
        repoOwner: "owner",
        repoName: "repo",
        commitSha: "abc123",
        installationId: 12345,
        failedJobs: [],
        workflowName: "CI",
      });

      expect(queries.updateRetryAttempt).toHaveBeenCalled();
    });
  });

  describe("manualTrigger", () => {
    it("should allow manual trigger of auto-heal", async () => {
      const { manualTrigger } = await import("../../orchestrator/auto-heal");

      await expect(
        manualTrigger({
          repoOwner: "owner",
          repoName: "repo",
          workflowRunId: 12345,
          installationId: 12345,
        }),
      ).resolves.not.toThrow();
    });
  });
});
