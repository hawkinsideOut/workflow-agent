/**
 * Auto-heal orchestrator
 * Triggers the workflow-agent fix command when pipelines fail
 */

import { spawn } from "child_process";
import { getEnv } from "../config/env.js";
import {
  incrementAttempt,
  markExhausted,
  recordHealAttempt,
} from "../db/queries.js";
import { getWorkflowRunLogs } from "../github/client.js";

export interface AutoHealContext {
  installationId: number;
  owner: string;
  repo: string;
  commitSha: string;
  workflowRunId: number;
  failedJobs: Array<{
    name: string;
    conclusion: string;
    steps: Array<{ name: string; conclusion: string; number: number }>;
  }>;
  attemptNumber: number;
}

/**
 * Calculate exponential backoff delay in milliseconds
 */
function calculateBackoff(attemptNumber: number): number {
  const env = getEnv();
  const baseMinutes = env.BACKOFF_BASE_MINUTES;
  const maxMinutes = env.BACKOFF_MAX_MINUTES;

  // Exponential backoff: base * 2^(attempt-1), capped at max
  const delayMinutes = Math.min(
    baseMinutes * Math.pow(2, attemptNumber - 1),
    maxMinutes,
  );

  return delayMinutes * 60 * 1000;
}

/**
 * Parse error messages from failed job information
 */
function parseErrorMessage(
  failedJobs: AutoHealContext["failedJobs"],
): string {
  const errors: string[] = [];

  for (const job of failedJobs) {
    const failedSteps = job.steps
      .filter((s) => s.conclusion === "failure")
      .map((s) => s.name);

    if (failedSteps.length > 0) {
      errors.push(`Job "${job.name}" failed at steps: ${failedSteps.join(", ")}`);
    } else {
      errors.push(`Job "${job.name}" failed`);
    }
  }

  return errors.join("\n");
}

/**
 * Execute the workflow-agent fix command
 */
async function executeFixCommand(
  repoPath: string,
  errorMessage: string,
  context: string,
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // Build the command arguments
    const args = [
      "fix",
      "--error",
      errorMessage,
      "--context",
      context,
      "--auto",
    ];

    console.log(`🔧 Running: workflow-agent ${args.join(" ")}`);

    const child = spawn("workflow-agent", args, {
      cwd: repoPath,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // Pass through any needed environment variables
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      console.log(`[fix] ${data.toString().trim()}`);
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
      console.error(`[fix:err] ${data.toString().trim()}`);
    });

    child.on("close", (code) => {
      const duration = Date.now() - startTime;
      console.log(`🏁 Fix command completed in ${duration}ms with code ${code}`);

      if (code === 0) {
        resolve({
          success: true,
          output: stdout,
        });
      } else {
        resolve({
          success: false,
          output: stdout,
          error: stderr || `Exit code: ${code}`,
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        output: stdout,
        error: `Failed to spawn: ${err.message}`,
      });
    });
  });
}

/**
 * Clone or update a repository locally for fixing
 */
async function prepareRepository(
  owner: string,
  repo: string,
  _commitSha: string,
): Promise<string> {
  // In production, this would clone the repo to a temp directory
  // For now, we assume the repo is available locally or via GitHub API
  const repoPath = `/tmp/workflow-agent-repos/${owner}/${repo}`;

  // This is a simplified version - real implementation would:
  // 1. Clone the repo if not exists
  // 2. Fetch latest changes
  // 3. Checkout the specific commit/branch
  // 4. Install dependencies

  console.log(`📂 Repository path: ${repoPath}`);

  return repoPath;
}

/**
 * Trigger the auto-heal process
 */
export async function triggerAutoHeal(context: AutoHealContext): Promise<void> {
  const env = getEnv();
  const {
    installationId,
    owner,
    repo,
    commitSha,
    workflowRunId,
    failedJobs,
    attemptNumber,
  } = context;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    AUTO-HEAL TRIGGERED                       ║
╚══════════════════════════════════════════════════════════════╝
  Repository: ${owner}/${repo}
  Commit: ${commitSha.slice(0, 7)}
  Attempt: ${attemptNumber}/${env.MAX_RETRIES}
  Failed Jobs: ${failedJobs.map((j) => j.name).join(", ")}
`);

  // Calculate and apply backoff delay
  if (attemptNumber > 1) {
    const backoffMs = calculateBackoff(attemptNumber);
    console.log(
      `⏳ Applying backoff delay: ${Math.round(backoffMs / 60000)} minutes`,
    );
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  // Increment the attempt counter
  const retryRecord = incrementAttempt(
    commitSha,
    owner,
    repo,
    parseErrorMessage(failedJobs),
  );

  const startTime = Date.now();

  try {
    // Parse error details
    const errorMessage = parseErrorMessage(failedJobs);

    // Try to get more detailed logs
    let detailedLogs = "";
    try {
      detailedLogs = await getWorkflowRunLogs(
        installationId,
        owner,
        repo,
        workflowRunId,
      );
    } catch (logError) {
      console.warn("⚠️  Could not fetch detailed logs:", logError);
    }

    // Prepare the repository
    const repoPath = await prepareRepository(owner, repo, commitSha);

    // Build context for the fix command
    const fixContext = JSON.stringify({
      workflow_run_id: workflowRunId,
      failed_jobs: failedJobs,
      attempt: attemptNumber,
      logs: detailedLogs.slice(0, 5000), // Limit context size
    });

    // Execute the fix command
    const result = await executeFixCommand(repoPath, errorMessage, fixContext);

    const durationMs = Date.now() - startTime;

    // Record the attempt in history
    recordHealAttempt(
      retryRecord.id,
      errorMessage,
      `workflow-agent fix --error "${errorMessage.slice(0, 200)}"`,
      result.output.slice(0, 10000),
      commitSha,
      undefined, // We'd need to get the new commit SHA after push
      result.success,
      durationMs,
    );

    if (result.success) {
      console.log(`✅ Auto-heal succeeded!`);
      // Don't mark as success yet - wait for the next workflow run to confirm
    } else {
      console.log(`❌ Auto-heal failed: ${result.error}`);

      // Check if we've exhausted retries
      if (attemptNumber >= env.MAX_RETRIES) {
        markExhausted(commitSha, owner, repo);
        console.log(`⚠️  Max retries exhausted for ${commitSha.slice(0, 7)}`);

        // Post a comment to notify maintainers
        // TODO: Get PR number from workflow run
        // await createPRComment(
        //   installationId,
        //   owner,
        //   repo,
        //   prNumber,
        //   `## ⚠️ Auto-Heal Exhausted\n\nAfter ${env.MAX_RETRIES} attempts, the pipeline still fails. Manual intervention required.\n\nLast error:\n\`\`\`\n${errorMessage}\n\`\`\``,
        // );
      }
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;

    console.error(`💥 Auto-heal error:`, error);

    recordHealAttempt(
      retryRecord.id,
      parseErrorMessage(failedJobs),
      undefined,
      undefined,
      commitSha,
      undefined,
      false,
      durationMs,
    );

    throw error;
  }
}

/**
 * Manually trigger auto-heal for a specific commit (for testing/debugging)
 */
export async function manualTrigger(
  owner: string,
  repo: string,
  commitSha: string,
  errorMessage: string,
): Promise<void> {
  console.log(`🔧 Manual auto-heal trigger for ${owner}/${repo}@${commitSha.slice(0, 7)}`);

  const repoPath = await prepareRepository(owner, repo, commitSha);

  const result = await executeFixCommand(repoPath, errorMessage, "{}");

  if (result.success) {
    console.log(`✅ Manual fix succeeded`);
  } else {
    console.log(`❌ Manual fix failed: ${result.error}`);
  }
}
