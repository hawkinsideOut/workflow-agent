/**
 * Workflow GitHub App - Package exports
 */

// Config
export { loadEnv, getEnv, isDev, isProd } from "./config/index.js";
export type { Env } from "./config/index.js";

// Database
export {
  getDatabase,
  closeDatabase,
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
} from "./db/index.js";

export type {
  RetryAttempt,
  VisualBaseline,
  VisualComparison,
  WebhookEvent,
  AutoHealHistory,
} from "./db/index.js";

// GitHub
export {
  getAppOctokit,
  getInstallationOctokit,
  getInstallationId,
  getWorkflowRunLogs,
  getFailedWorkflowDetails,
  createCheckRun,
  createPRComment,
} from "./github/index.js";

// LLM
export {
  getLLMClient,
  compareImages,
  generateFix,
  isLLMAvailable,
  anthropicClient,
  openaiClient,
} from "./llm/index.js";

export type {
  LLMClient,
  VisualCompareResult,
  FixSuggestion,
} from "./llm/index.js";

// Orchestrator
export { triggerAutoHeal, manualTrigger } from "./orchestrator/index.js";
export type { AutoHealContext } from "./orchestrator/index.js";

// Visual testing
export {
  captureScreenshot,
  captureResponsiveScreenshots,
  captureBaseline,
  compareWithBaseline,
  updateBaseline,
  runVisualTests,
  generateMarkdownReport,
  postCheckRun,
  postPRComment,
  generateTerminalSummary,
  closeBrowser,
} from "./visual/index.js";

export type {
  ScreenshotOptions,
  ScreenshotResult,
  CompareOptions,
  ComparisonResult,
} from "./visual/index.js";

// Server
export { app, startServer } from "./server.js";

// Webhooks
export { getWebhooks, handleWebhook } from "./webhooks/index.js";
