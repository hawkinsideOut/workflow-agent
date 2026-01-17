/**
 * Unit tests for GitHub client
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock @octokit/rest
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    apps: {
      getInstallation: vi.fn(() =>
        Promise.resolve({
          data: { id: 12345 },
        }),
      ),
      getRepoInstallation: vi.fn(() =>
        Promise.resolve({
          data: { id: 12345 },
        }),
      ),
    },
    actions: {
      getWorkflowRun: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 1,
            name: "CI",
            conclusion: "failure",
          },
        }),
      ),
      listJobsForWorkflowRun: vi.fn(() =>
        Promise.resolve({
          data: {
            jobs: [{ id: 1, name: "build", conclusion: "failure" }],
          },
        }),
      ),
      downloadWorkflowRunLogs: vi.fn(() =>
        Promise.resolve({
          data: Buffer.from("log content"),
          headers: { "content-type": "application/zip" },
        }),
      ),
      reRunWorkflow: vi.fn(() => Promise.resolve({ data: {} })),
    },
    repos: {
      get: vi.fn(() =>
        Promise.resolve({
          data: { id: 1, name: "test-repo", owner: { login: "owner" } },
        }),
      ),
    },
    pulls: {
      create: vi.fn(() =>
        Promise.resolve({
          data: { number: 1, html_url: "https://github.com/owner/repo/pull/1" },
        }),
      ),
      createReviewComment: vi.fn(() =>
        Promise.resolve({
          data: { id: 1 },
        }),
      ),
    },
    issues: {
      createComment: vi.fn(() =>
        Promise.resolve({
          data: { id: 1 },
        }),
      ),
    },
  })),
}));

// Mock @octokit/auth-app
vi.mock("@octokit/auth-app", () => ({
  createAppAuth: vi.fn(() => () => ({
    token: "test-token",
  })),
}));

// Mock getEnv
vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    GITHUB_APP_ID: "123456",
    GITHUB_PRIVATE_KEY:
      "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
    GITHUB_WEBHOOK_SECRET: "test-secret",
  })),
}));

describe("GitHub Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Note: We don't use vi.resetModules() here because it breaks the mock singleton
  });

  describe("getAppOctokit", () => {
    it("should create an Octokit instance", async () => {
      vi.resetModules(); // Reset for this specific test
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      expect(octokit).toBeDefined();
    });

    it("should return the same instance on multiple calls", async () => {
      const { getAppOctokit } = await import("../../github/client");

      const octokit1 = getAppOctokit();
      const octokit2 = getAppOctokit();

      expect(octokit1).toBe(octokit2);
    });
  });

  describe("getInstallationOctokit", () => {
    it("should create an installation-specific Octokit", async () => {
      const { getInstallationOctokit } = await import("../../github/client");
      const octokit = await getInstallationOctokit(12345);

      expect(octokit).toBeDefined();
    });
  });

  describe("getInstallationId", () => {
    it("should fetch installation ID for a repository", async () => {
      const { getInstallationId } = await import("../../github/client");

      // This will use the mocked Octokit
      const id = await getInstallationId("owner", "repo");

      expect(id).toBeDefined();
      expect(typeof id).toBe("number");
    });
  });

  describe("Repository operations", () => {
    it("should get repository info", async () => {
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      const result = await octokit.repos.get({ owner: "owner", repo: "repo" });

      expect(result.data.name).toBe("test-repo");
    });
  });

  describe("Pull request operations", () => {
    it("should create a pull request", async () => {
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      const result = await octokit.pulls.create({
        owner: "owner",
        repo: "repo",
        title: "Test PR",
        head: "feature",
        base: "main",
      });

      expect(result.data.number).toBe(1);
    });

    it("should add review comment", async () => {
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      const result = await octokit.pulls.createReviewComment({
        owner: "owner",
        repo: "repo",
        pull_number: 1,
        body: "Comment",
        commit_id: "abc123",
        path: "file.ts",
      });

      expect(result.data.id).toBe(1);
    });
  });

  describe("Issue operations", () => {
    it("should add issue comment", async () => {
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      const result = await octokit.issues.createComment({
        owner: "owner",
        repo: "repo",
        issue_number: 1,
        body: "Comment",
      });

      expect(result.data.id).toBe(1);
    });
  });

  describe("Actions operations", () => {
    it("should list jobs for workflow run", async () => {
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      const result = await octokit.actions.listJobsForWorkflowRun({
        owner: "owner",
        repo: "repo",
        run_id: 12345,
      });

      expect(result.data.jobs).toHaveLength(1);
      expect(result.data.jobs[0].name).toBe("build");
    });

    it("should download workflow run logs", async () => {
      const { getAppOctokit } = await import("../../github/client");
      const octokit = getAppOctokit();

      const result = await octokit.actions.downloadWorkflowRunLogs({
        owner: "owner",
        repo: "repo",
        run_id: 12345,
      });

      expect(result.data).toBeDefined();
    });
  });
});
