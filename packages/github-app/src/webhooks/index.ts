/**
 * Webhook handlers for GitHub events
 */

import { Webhooks, type EmitterWebhookEvent } from "@octokit/webhooks";
import { getEnv } from "../config/env.js";
import { logWebhookEvent, markWebhookProcessed } from "../db/queries.js";
import { handleWorkflowRunCompleted } from "./workflow-run.js";

let _webhooks: Webhooks | null = null;

/**
 * Get the configured webhooks handler
 */
export function getWebhooks(): Webhooks {
  if (_webhooks) {
    return _webhooks;
  }

  const env = getEnv();

  _webhooks = new Webhooks({
    secret: env.GITHUB_WEBHOOK_SECRET,
  });

  // Register event handlers
  registerHandlers(_webhooks);

  return _webhooks;
}

/**
 * Register all webhook event handlers
 */
function registerHandlers(webhooks: Webhooks): void {
  // Workflow run events - main entry point for pipeline monitoring
  webhooks.on("workflow_run.completed", async (event) => {
    const { payload } = event;
    const repo = payload.repository;

    // Log the event
    const webhookEvent = logWebhookEvent(
      "workflow_run",
      "completed",
      repo.owner.login,
      repo.name,
      JSON.stringify({
        run_id: payload.workflow_run.id,
        conclusion: payload.workflow_run.conclusion,
        workflow: payload.workflow_run.name,
        head_sha: payload.workflow_run.head_sha,
      }),
    );

    try {
      await handleWorkflowRunCompleted(event);
      markWebhookProcessed(webhookEvent.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      markWebhookProcessed(webhookEvent.id, errorMessage);
      console.error("Error processing workflow_run.completed:", error);
    }
  });

  // Check run events - for more granular check status
  webhooks.on("check_run.completed", async (event) => {
    const { payload } = event;
    const repo = payload.repository;

    logWebhookEvent(
      "check_run",
      "completed",
      repo.owner.login,
      repo.name,
      JSON.stringify({
        check_run_id: payload.check_run.id,
        name: payload.check_run.name,
        conclusion: payload.check_run.conclusion,
      }),
    );

    // Check runs are handled through workflow_run for simplicity
    // Individual check_run events could be used for more granular control
  });

  // Pull request events - for visual testing triggers
  webhooks.on("pull_request.opened", async (event) => {
    const { payload } = event;
    const repo = payload.repository;

    logWebhookEvent(
      "pull_request",
      "opened",
      repo.owner.login,
      repo.name,
      JSON.stringify({
        pr_number: payload.pull_request.number,
        head_sha: payload.pull_request.head.sha,
        title: payload.pull_request.title,
      }),
    );

    // TODO: Trigger visual testing for new PRs
  });

  webhooks.on("pull_request.synchronize", async (event) => {
    const { payload } = event;
    const repo = payload.repository;

    logWebhookEvent(
      "pull_request",
      "synchronize",
      repo.owner.login,
      repo.name,
      JSON.stringify({
        pr_number: payload.pull_request.number,
        head_sha: payload.pull_request.head.sha,
      }),
    );

    // TODO: Re-run visual testing when PR is updated
  });

  // Installation events - for tracking app installations
  webhooks.on("installation.created", async (event) => {
    const { payload } = event;
    const account = payload.installation.account;
    const accountName =
      account && "login" in account
        ? account.login
        : account?.name || "unknown";

    logWebhookEvent(
      "installation",
      "created",
      accountName,
      undefined,
      JSON.stringify({
        installation_id: payload.installation.id,
        repositories: payload.repositories?.length || 0,
      }),
    );

    console.log(`✅ App installed for ${accountName}`);
  });

  // Ping event - GitHub sends this when webhook is first configured
  webhooks.on("ping", async (event) => {
    logWebhookEvent("ping", undefined, undefined, undefined, event.payload.zen);
    console.log(`🏓 Ping received: ${event.payload.zen}`);
  });
}

/**
 * Verify and handle a webhook request
 */
export async function handleWebhook(
  eventType: string,
  signature: string,
  body: string,
): Promise<void> {
  const webhooks = getWebhooks();

  // Verify the signature and emit the event
  await webhooks.verifyAndReceive({
    id: crypto.randomUUID(),
    name: eventType as EmitterWebhookEvent["name"],
    signature,
    payload: body,
  });
}

/**
 * Reset the webhooks instance (useful for testing)
 */
export function resetWebhooks(): void {
  _webhooks = null;
}
