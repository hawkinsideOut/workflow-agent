/**
 * Workflow run event handler
 * Triggers auto-healing when a workflow fails
 */

import type { EmitterWebhookEvent } from "@octokit/webhooks";
import { getEnv } from "../config/env.js";
import {
  getOrCreateRetryAttempt,
  isMaxRetriesReached,
  markExhausted,
} from "../db/queries.js";
import { triggerAutoHeal } from "../orchestrator/auto-heal.js";
import { getInstallationId, getFailedWorkflowDetails } from "../github/client.js";

type WorkflowRunCompletedEvent = EmitterWebhookEvent<"workflow_run.completed">;

/**
 * Handle workflow_run.completed events
 * If the workflow failed, trigger the auto-heal process
 */
export async function handleWorkflowRunCompleted(
  event: WorkflowRunCompletedEvent,
): Promise<void> {
  const { payload } = event;
  const workflowRun = payload.workflow_run;
  const repo = payload.repository;
  const env = getEnv();

  const owner = repo.owner.login;
  const repoName = repo.name;
  const commitSha = workflowRun.head_sha;
  const runId = workflowRun.id;

  console.log(
    `📦 Workflow "${workflowRun.name}" completed with conclusion: ${workflowRun.conclusion}`,
  );

  // Only process failed workflows
  if (workflowRun.conclusion !== "failure") {
    console.log(`✅ Workflow passed, no action needed`);
    return;
  }

  console.log(`❌ Workflow failed, checking retry status...`);

  // Check if we've already exhausted retries for this commit
  if (isMaxRetriesReached(commitSha, owner, repoName, env.MAX_RETRIES)) {
    console.log(
      `⚠️  Max retries (${env.MAX_RETRIES}) reached for ${commitSha.slice(0, 7)}, skipping`,
    );
    markExhausted(commitSha, owner, repoName);
    return;
  }

  // Get or create a retry attempt record
  const retryAttempt = getOrCreateRetryAttempt(
    commitSha,
    owner,
    repoName,
    runId,
  );

  console.log(
    `🔄 Attempt ${retryAttempt.attempt_count + 1}/${env.MAX_RETRIES} for ${commitSha.slice(0, 7)}`,
  );

  try {
    // Get the installation ID for this repo
    const installationId = await getInstallationId(owner, repoName);

    // Get details about what failed
    const failedDetails = await getFailedWorkflowDetails(
      installationId,
      owner,
      repoName,
      runId,
    );

    console.log(`📋 Failed jobs:`, failedDetails.failedJobs.map((j) => j.name));

    // Trigger the auto-heal process
    await triggerAutoHeal({
      installationId,
      owner,
      repo: repoName,
      commitSha,
      workflowRunId: runId,
      failedJobs: failedDetails.failedJobs,
      attemptNumber: retryAttempt.attempt_count + 1,
    });
  } catch (error) {
    console.error(`💥 Failed to trigger auto-heal:`, error);
    throw error;
  }
}
