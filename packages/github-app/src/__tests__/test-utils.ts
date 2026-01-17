/**
 * Test utilities and factories
 */

import { vi } from "vitest";

/**
 * Create a fresh in-memory database for testing
 */
export async function createTestDatabase() {
  const SQL = await import("sql.js");
  const SQLModule = await SQL.default();
  const db = new SQLModule.Database();

  // Initialize schema
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
}

/**
 * Create a mock GitHub webhook payload
 */
export function createMockWebhookPayload(
  overrides: Record<string, unknown> = {},
) {
  return {
    repository: {
      owner: { login: "test-owner" },
      name: "test-repo",
      full_name: "test-owner/test-repo",
    },
    sender: {
      login: "test-user",
    },
    installation: {
      id: 12345,
    },
    ...overrides,
  };
}

/**
 * Create a mock workflow run event
 */
export function createMockWorkflowRunPayload(
  conclusion: "success" | "failure" | "cancelled" = "failure",
  overrides: Record<string, unknown> = {},
) {
  return {
    action: "completed",
    workflow_run: {
      id: 123456789,
      name: "CI",
      node_id: "WFR_123",
      head_sha: "abc123def456",
      status: "completed",
      conclusion,
      url: "https://api.github.com/repos/test-owner/test-repo/actions/runs/123456789",
      html_url:
        "https://github.com/test-owner/test-repo/actions/runs/123456789",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    repository: {
      owner: { login: "test-owner" },
      name: "test-repo",
      full_name: "test-owner/test-repo",
    },
    installation: {
      id: 12345,
    },
    ...overrides,
  };
}

/**
 * Create a mock Octokit instance
 */
export function createMockOctokit() {
  return {
    apps: {
      getRepoInstallation: vi.fn().mockResolvedValue({ data: { id: 12345 } }),
    },
    actions: {
      downloadWorkflowRunLogs: vi
        .fn()
        .mockResolvedValue({ url: "https://example.com/logs.zip" }),
      listJobsForWorkflowRun: vi.fn().mockResolvedValue({
        data: {
          jobs: [
            {
              id: 1,
              name: "build",
              status: "completed",
              conclusion: "failure",
              steps: [
                { name: "Checkout", conclusion: "success", number: 1 },
                { name: "Build", conclusion: "failure", number: 2 },
              ],
            },
          ],
        },
      }),
    },
    rest: {
      repos: {
        getContent: vi.fn().mockResolvedValue({ data: { content: "" } }),
        createOrUpdateFileContents: vi
          .fn()
          .mockResolvedValue({ data: { commit: { sha: "new-sha" } } }),
      },
      pulls: {
        create: vi.fn().mockResolvedValue({
          data: { number: 1, html_url: "https://github.com/pr/1" },
        }),
        createReviewComment: vi.fn().mockResolvedValue({ data: {} }),
      },
      issues: {
        createComment: vi.fn().mockResolvedValue({ data: {} }),
      },
    },
  };
}

/**
 * Create a mock Anthropic client
 */
export function createMockAnthropicClient() {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hasDifferences: false,
              summary: "No visual differences detected",
              differences: [],
              confidence: 0.95,
            }),
          },
        ],
      }),
    },
  };
}

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  hasDifferences: false,
                  summary: "No visual differences detected",
                  differences: [],
                  confidence: 0.95,
                }),
              },
            },
          ],
        }),
      },
    },
  };
}

/**
 * Create a mock Playwright browser
 */
export function createMockPlaywrightBrowser() {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("mock-screenshot")),
    addStyleTag: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
  };

  return { browser: mockBrowser, context: mockContext, page: mockPage };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("waitFor timeout exceeded");
}
