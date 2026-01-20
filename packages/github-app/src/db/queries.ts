/**
 * Database query functions for retry tracking and visual baselines
 * Uses sql.js (WASM-based SQLite)
 */

import { getDatabase, saveDatabase } from "./client.js";
import type {
  RetryAttempt,
  VisualBaseline,
  VisualComparison,
  WebhookEvent,
  AutoHealHistory,
  CommunityPattern,
  ContributorRateLimit,
} from "./schema.js";

// =============================================================================
// Helper functions for sql.js
// =============================================================================

/**
 * Execute a query and return the first row as an object
 */
function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    stmt.free();
    return Object.fromEntries(columns.map((c, i) => [c, values[i]])) as T;
  }
  stmt.free();
  return null;
}

/**
 * Execute a query and return all rows as objects
 */
function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const columns = stmt.getColumnNames();
  const results: T[] = [];
  while (stmt.step()) {
    const values = stmt.get();
    results.push(
      Object.fromEntries(columns.map((c, i) => [c, values[i]])) as T,
    );
  }
  stmt.free();
  return results;
}

/**
 * Execute an insert/update/delete and return the number of changes
 */
function execute(sql: string, params: unknown[] = []): number {
  const db = getDatabase();
  db.run(sql, params);
  saveDatabase();
  return db.getRowsModified();
}

/**
 * Execute an insert and return the inserted row
 */
function insertAndReturn<T>(sql: string, params: unknown[] = []): T {
  const db = getDatabase();
  db.run(sql, params);
  saveDatabase();
  // For sql.js, we need to query the last inserted row
  const lastId = (
    queryOne<{ id: number }>("SELECT last_insert_rowid() as id") as {
      id: number;
    }
  ).id;
  // Get the table name from the SQL (simple extraction)
  const match = sql.match(/INSERT INTO (\w+)/i);
  if (match) {
    const tableName = match[1];
    return queryOne<T>(`SELECT * FROM ${tableName} WHERE id = ?`, [
      lastId,
    ]) as T;
  }
  throw new Error("Could not determine table name from INSERT statement");
}

// =============================================================================
// Retry Attempts Queries
// =============================================================================

/**
 * Get the current retry attempt for a commit
 */
export function getRetryAttempt(
  commitSha: string,
  repoOwner: string,
  repoName: string,
): RetryAttempt | null {
  return queryOne<RetryAttempt>(
    `SELECT * FROM retry_attempts 
     WHERE commit_sha = ? AND repo_owner = ? AND repo_name = ?`,
    [commitSha, repoOwner, repoName],
  );
}

/**
 * Create or get an existing retry attempt record
 */
export function getOrCreateRetryAttempt(
  commitSha: string,
  repoOwner: string,
  repoName: string,
  workflowRunId?: number,
): RetryAttempt {
  const existing = getRetryAttempt(commitSha, repoOwner, repoName);
  if (existing) {
    return existing;
  }

  return insertAndReturn<RetryAttempt>(
    `INSERT INTO retry_attempts (commit_sha, repo_owner, repo_name, workflow_run_id, attempt_count, status)
     VALUES (?, ?, ?, ?, 0, 'pending')`,
    [commitSha, repoOwner, repoName, workflowRunId ?? null],
  );
}

/**
 * Increment the attempt count and update timestamp
 */
export function incrementAttempt(
  commitSha: string,
  repoOwner: string,
  repoName: string,
  error?: string,
): RetryAttempt {
  execute(
    `UPDATE retry_attempts 
     SET attempt_count = attempt_count + 1,
         last_attempt_at = datetime('now'),
         last_error = ?,
         status = 'healing',
         updated_at = datetime('now')
     WHERE commit_sha = ? AND repo_owner = ? AND repo_name = ?`,
    [error ?? null, commitSha, repoOwner, repoName],
  );

  return getRetryAttempt(commitSha, repoOwner, repoName) as RetryAttempt;
}

/**
 * Mark a retry attempt as successful
 */
export function markSuccess(
  commitSha: string,
  repoOwner: string,
  repoName: string,
): void {
  execute(
    `UPDATE retry_attempts 
     SET status = 'success', updated_at = datetime('now')
     WHERE commit_sha = ? AND repo_owner = ? AND repo_name = ?`,
    [commitSha, repoOwner, repoName],
  );
}

/**
 * Mark a retry attempt as exhausted (max retries reached)
 */
export function markExhausted(
  commitSha: string,
  repoOwner: string,
  repoName: string,
): void {
  execute(
    `UPDATE retry_attempts 
     SET status = 'exhausted', updated_at = datetime('now')
     WHERE commit_sha = ? AND repo_owner = ? AND repo_name = ?`,
    [commitSha, repoOwner, repoName],
  );
}

/**
 * Check if max retries have been reached
 */
export function isMaxRetriesReached(
  commitSha: string,
  repoOwner: string,
  repoName: string,
  maxRetries: number = 10,
): boolean {
  const attempt = getRetryAttempt(commitSha, repoOwner, repoName);
  return attempt ? attempt.attempt_count >= maxRetries : false;
}

/**
 * Reset attempts for a commit (e.g., after manual intervention)
 */
export function resetAttempts(
  commitSha: string,
  repoOwner: string,
  repoName: string,
): void {
  execute(
    `UPDATE retry_attempts 
     SET attempt_count = 0, status = 'pending', updated_at = datetime('now')
     WHERE commit_sha = ? AND repo_owner = ? AND repo_name = ?`,
    [commitSha, repoOwner, repoName],
  );
}

/**
 * Get all pending or healing attempts
 */
export function getActiveAttempts(): RetryAttempt[] {
  return queryAll<RetryAttempt>(
    `SELECT * FROM retry_attempts WHERE status IN ('pending', 'healing')`,
  );
}

// =============================================================================
// Visual Baselines Queries
// =============================================================================

/**
 * Get a visual baseline by name
 */
export function getBaseline(
  name: string,
  repoOwner?: string,
  repoName?: string,
): VisualBaseline | null {
  return queryOne<VisualBaseline>(
    `SELECT * FROM visual_baselines 
     WHERE name = ? AND (repo_owner = ? OR repo_owner IS NULL) 
     AND (repo_name = ? OR repo_name IS NULL)`,
    [name, repoOwner ?? null, repoName ?? null],
  );
}

/**
 * Create or update a visual baseline
 */
export function upsertBaseline(
  name: string,
  url: string,
  screenshotPath: string,
  viewportWidth: number = 1280,
  viewportHeight: number = 720,
  repoOwner?: string,
  repoName?: string,
): VisualBaseline {
  const existing = getBaseline(name, repoOwner, repoName);

  if (existing) {
    execute(
      `UPDATE visual_baselines SET
         url = ?,
         screenshot_path = ?,
         viewport_width = ?,
         viewport_height = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      [url, screenshotPath, viewportWidth, viewportHeight, existing.id],
    );
    return getBaseline(name, repoOwner, repoName) as VisualBaseline;
  }

  return insertAndReturn<VisualBaseline>(
    `INSERT INTO visual_baselines (name, url, screenshot_path, viewport_width, viewport_height, repo_owner, repo_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      url,
      screenshotPath,
      viewportWidth,
      viewportHeight,
      repoOwner ?? null,
      repoName ?? null,
    ],
  );
}

/**
 * List all baselines for a repository
 */
export function listBaselines(
  repoOwner?: string,
  repoName?: string,
): VisualBaseline[] {
  if (repoOwner && repoName) {
    return queryAll<VisualBaseline>(
      `SELECT * FROM visual_baselines 
       WHERE repo_owner = ? AND repo_name = ?
       ORDER BY name`,
      [repoOwner, repoName],
    );
  }

  return queryAll<VisualBaseline>(
    `SELECT * FROM visual_baselines ORDER BY name`,
  );
}

/**
 * Delete a baseline
 */
export function deleteBaseline(
  name: string,
  repoOwner?: string,
  repoName?: string,
): boolean {
  const changes = execute(
    `DELETE FROM visual_baselines 
     WHERE name = ? AND (repo_owner = ? OR repo_owner IS NULL)
     AND (repo_name = ? OR repo_name IS NULL)`,
    [name, repoOwner ?? null, repoName ?? null],
  );

  return changes > 0;
}

// =============================================================================
// Visual Comparisons Queries
// =============================================================================

/**
 * Record a visual comparison result
 */
export function recordComparison(
  baselineId: number,
  beforePath: string,
  afterPath: string,
  hasDifferences: boolean,
  differenceSummary?: string,
  differenceDetails?: string,
  confidence?: number,
  llmProvider?: string,
  commitSha?: string,
  prNumber?: number,
): VisualComparison {
  return insertAndReturn<VisualComparison>(
    `INSERT INTO visual_comparisons 
     (baseline_id, before_path, after_path, has_differences, difference_summary, 
      difference_details, confidence, llm_provider, commit_sha, pr_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      baselineId,
      beforePath,
      afterPath,
      hasDifferences ? 1 : 0,
      differenceSummary ?? null,
      differenceDetails ?? null,
      confidence ?? null,
      llmProvider ?? null,
      commitSha ?? null,
      prNumber ?? null,
    ],
  );
}

/**
 * Get comparison history for a baseline
 */
export function getComparisonHistory(
  baselineId: number,
  limit: number = 10,
): VisualComparison[] {
  return queryAll<VisualComparison>(
    `SELECT * FROM visual_comparisons 
     WHERE baseline_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [baselineId, limit],
  );
}

// =============================================================================
// Webhook Events Queries
// =============================================================================

/**
 * Log a webhook event
 */
export function logWebhookEvent(
  eventType: string,
  action?: string,
  repoOwner?: string,
  repoName?: string,
  payloadSummary?: string,
): WebhookEvent {
  return insertAndReturn<WebhookEvent>(
    `INSERT INTO webhook_events (event_type, action, repo_owner, repo_name, payload_summary)
     VALUES (?, ?, ?, ?, ?)`,
    [
      eventType,
      action ?? null,
      repoOwner ?? null,
      repoName ?? null,
      payloadSummary ?? null,
    ],
  );
}

/**
 * Mark a webhook event as processed
 */
export function markWebhookProcessed(id: number, error?: string): void {
  execute(`UPDATE webhook_events SET processed = 1, error = ? WHERE id = ?`, [
    error ?? null,
    id,
  ]);
}

/**
 * Get recent webhook events
 */
export function getRecentWebhookEvents(limit: number = 50): WebhookEvent[] {
  return queryAll<WebhookEvent>(
    `SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

// =============================================================================
// Auto-Heal History Queries
// =============================================================================

/**
 * Record an auto-heal attempt
 */
export function recordHealAttempt(
  retryAttemptId: number,
  errorMessage: string,
  fixPrompt?: string,
  fixApplied?: string,
  commitShaBefore?: string,
  commitShaAfter?: string,
  success: boolean = false,
  durationMs?: number,
): AutoHealHistory {
  return insertAndReturn<AutoHealHistory>(
    `INSERT INTO auto_heal_history 
     (retry_attempt_id, error_message, fix_prompt, fix_applied, 
      commit_sha_before, commit_sha_after, success, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      retryAttemptId,
      errorMessage,
      fixPrompt ?? null,
      fixApplied ?? null,
      commitShaBefore ?? null,
      commitShaAfter ?? null,
      success ? 1 : 0,
      durationMs ?? null,
    ],
  );
}

/**
 * Get heal history for a retry attempt
 */
export function getHealHistory(retryAttemptId: number): AutoHealHistory[] {
  return queryAll<AutoHealHistory>(
    `SELECT * FROM auto_heal_history 
     WHERE retry_attempt_id = ?
     ORDER BY created_at DESC`,
    [retryAttemptId],
  );
}

// =============================================================================
// Community Patterns Queries
// =============================================================================

/**
 * Rate limiting constants
 */
const RATE_LIMIT_MAX = 100; // Max patterns per window
const RATE_LIMIT_WINDOW_HOURS = 1; // Window duration in hours

/**
 * Check if a contributor has exceeded their rate limit
 * Returns { allowed: boolean, remaining: number, resetAt: string | null }
 */
export function checkRateLimit(contributorId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
} {
  const limit = queryOne<ContributorRateLimit>(
    `SELECT * FROM contributor_rate_limits WHERE contributor_id = ?`,
    [contributorId],
  );

  if (!limit) {
    // No record = not rate limited
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: null };
  }

  // Check if window has expired
  const windowStart = new Date(limit.window_start);
  const windowEnd = new Date(
    windowStart.getTime() + RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const now = new Date();

  if (now > windowEnd) {
    // Window expired, reset the counter
    execute(
      `UPDATE contributor_rate_limits 
       SET push_count = 0, window_start = datetime('now'), updated_at = datetime('now')
       WHERE contributor_id = ?`,
      [contributorId],
    );
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: null };
  }

  // Window still active
  const remaining = Math.max(0, RATE_LIMIT_MAX - limit.push_count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: windowEnd.toISOString(),
  };
}

/**
 * Increment rate limit counter for a contributor
 */
export function incrementRateLimit(
  contributorId: string,
  count: number = 1,
): void {
  const existing = queryOne<ContributorRateLimit>(
    `SELECT * FROM contributor_rate_limits WHERE contributor_id = ?`,
    [contributorId],
  );

  if (!existing) {
    // Create new record
    execute(
      `INSERT INTO contributor_rate_limits (contributor_id, push_count, window_start)
       VALUES (?, ?, datetime('now'))`,
      [contributorId, count],
    );
  } else {
    // Update existing
    execute(
      `UPDATE contributor_rate_limits 
       SET push_count = push_count + ?, updated_at = datetime('now')
       WHERE contributor_id = ?`,
      [count, contributorId],
    );
  }
}

/**
 * Get a pattern by its UUID
 */
export function getPatternById(patternId: string): CommunityPattern | null {
  return queryOne<CommunityPattern>(
    `SELECT * FROM community_patterns WHERE pattern_id = ?`,
    [patternId],
  );
}

/**
 * Get a pattern by its hash (for deduplication)
 */
export function getPatternByHash(hash: string): CommunityPattern | null {
  return queryOne<CommunityPattern>(
    `SELECT * FROM community_patterns WHERE pattern_hash = ?`,
    [hash],
  );
}

/**
 * Create a new community pattern
 */
export function createPattern(
  patternId: string,
  patternType: "fix" | "blueprint" | "solution",
  patternData: string,
  contributorId?: string,
  patternHash?: string,
): CommunityPattern {
  return insertAndReturn<CommunityPattern>(
    `INSERT INTO community_patterns (pattern_id, pattern_type, pattern_data, contributor_id, pattern_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [patternId, patternType, patternData, contributorId ?? null, patternHash ?? null],
  );
}

/**
 * Batch create multiple patterns (within a transaction-like flow)
 * Returns count of successfully inserted patterns
 */
export function batchCreatePatterns(
  patterns: Array<{
    patternId: string;
    patternType: "fix" | "blueprint" | "solution";
    patternData: string;
    contributorId?: string;
    patternHash?: string;
  }>,
): { inserted: number; skipped: number; errors: string[] } {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of patterns) {
    try {
      // Check for duplicate by ID or hash
      const existingById = getPatternById(p.patternId);
      if (existingById) {
        skipped++;
        continue;
      }

      if (p.patternHash) {
        const existingByHash = getPatternByHash(p.patternHash);
        if (existingByHash) {
          skipped++;
          continue;
        }
      }

      createPattern(
        p.patternId,
        p.patternType,
        p.patternData,
        p.contributorId,
        p.patternHash,
      );
      inserted++;
    } catch (error) {
      errors.push(
        `Failed to insert ${p.patternId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Get patterns with pagination
 */
export function getPatterns(
  patternType?: "fix" | "blueprint" | "solution",
  limit: number = 50,
  offset: number = 0,
): { patterns: CommunityPattern[]; total: number } {
  let patterns: CommunityPattern[];
  let total: number;

  if (patternType) {
    patterns = queryAll<CommunityPattern>(
      `SELECT * FROM community_patterns 
       WHERE pattern_type = ?
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [patternType, limit, offset],
    );
    const countResult = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM community_patterns WHERE pattern_type = ?`,
      [patternType],
    );
    total = countResult?.count ?? 0;
  } else {
    patterns = queryAll<CommunityPattern>(
      `SELECT * FROM community_patterns 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    const countResult = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM community_patterns`,
    );
    total = countResult?.count ?? 0;
  }

  return { patterns, total };
}

/**
 * Get patterns newer than a given date (for incremental pulls)
 */
export function getPatternsNewerThan(
  since: string,
  limit: number = 100,
): CommunityPattern[] {
  return queryAll<CommunityPattern>(
    `SELECT * FROM community_patterns 
     WHERE created_at > ?
     ORDER BY created_at ASC 
     LIMIT ?`,
    [since, limit],
  );
}

