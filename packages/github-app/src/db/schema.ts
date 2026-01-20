/**
 * SQLite database schema for retry tracking and visual baselines
 */

/**
 * SQL statements to create required tables
 */
export const SCHEMA_SQL = `
-- Retry attempts tracking for auto-heal
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

-- Index for quick lookups by commit
CREATE INDEX IF NOT EXISTS idx_retry_commit ON retry_attempts(commit_sha, repo_owner, repo_name);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_retry_status ON retry_attempts(status);

-- Visual testing baselines
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

-- Index for baseline lookups
CREATE INDEX IF NOT EXISTS idx_baseline_name ON visual_baselines(name, repo_owner, repo_name);

-- Visual comparison history
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (baseline_id) REFERENCES visual_baselines(id)
);

-- Index for comparison history
CREATE INDEX IF NOT EXISTS idx_comparison_baseline ON visual_comparisons(baseline_id);
CREATE INDEX IF NOT EXISTS idx_comparison_commit ON visual_comparisons(commit_sha);

-- Webhook event log for debugging
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

-- Index for recent events
CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_events(created_at);

-- Auto-heal history for auditing
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (retry_attempt_id) REFERENCES retry_attempts(id)
);

-- Index for heal history
CREATE INDEX IF NOT EXISTS idx_heal_retry ON auto_heal_history(retry_attempt_id);

-- Community patterns registry
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

-- Index for pattern lookups
CREATE INDEX IF NOT EXISTS idx_pattern_type ON community_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_contributor ON community_patterns(contributor_id);
CREATE INDEX IF NOT EXISTS idx_pattern_hash ON community_patterns(pattern_hash);

-- Rate limiting for pattern push
CREATE TABLE IF NOT EXISTS contributor_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contributor_id TEXT NOT NULL UNIQUE,
  push_count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_contributor ON contributor_rate_limits(contributor_id);
`;

/**
 * Types for database records
 */
export interface RetryAttempt {
  id: number;
  commit_sha: string;
  repo_owner: string;
  repo_name: string;
  workflow_run_id: number | null;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error: string | null;
  status: "pending" | "healing" | "success" | "exhausted" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface VisualBaseline {
  id: number;
  name: string;
  url: string;
  repo_owner: string | null;
  repo_name: string | null;
  screenshot_path: string;
  viewport_width: number;
  viewport_height: number;
  created_at: string;
  updated_at: string;
}

export interface VisualComparison {
  id: number;
  baseline_id: number;
  commit_sha: string | null;
  pr_number: number | null;
  before_path: string;
  after_path: string;
  has_differences: number;
  difference_summary: string | null;
  difference_details: string | null;
  confidence: number | null;
  llm_provider: string | null;
  created_at: string;
}

export interface WebhookEvent {
  id: number;
  event_type: string;
  action: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  payload_summary: string | null;
  processed: number;
  error: string | null;
  created_at: string;
}

export interface AutoHealHistory {
  id: number;
  retry_attempt_id: number;
  error_message: string;
  fix_prompt: string | null;
  fix_applied: string | null;
  commit_sha_before: string | null;
  commit_sha_after: string | null;
  success: number;
  duration_ms: number | null;
  created_at: string;
}

export interface CommunityPattern {
  id: number;
  pattern_id: string;
  pattern_type: "fix" | "blueprint" | "solution";
  pattern_data: string;
  contributor_id: string | null;
  pattern_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributorRateLimit {
  id: number;
  contributor_id: string;
  push_count: number;
  window_start: string;
  created_at: string;
  updated_at: string;
}
