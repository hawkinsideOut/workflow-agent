/**
 * GitHub API client and authentication
 */

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { getEnv } from "../config/env.js";

let _appOctokit: Octokit | null = null;

/**
 * Get an authenticated Octokit instance for the GitHub App
 * This is used for app-level operations
 */
export function getAppOctokit(): Octokit {
  if (_appOctokit) {
    return _appOctokit;
  }

  const env = getEnv();

  _appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_PRIVATE_KEY,
    },
  });

  return _appOctokit;
}

/**
 * Get an authenticated Octokit instance for a specific installation
 * This is used for repository-specific operations
 */
export async function getInstallationOctokit(
  installationId: number,
): Promise<Octokit> {
  const env = getEnv();

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_PRIVATE_KEY,
      installationId,
    },
  });

  return octokit;
}

/**
 * Get an installation ID for a repository
 */
export async function getInstallationId(
  owner: string,
  repo: string,
): Promise<number> {
  const octokit = getAppOctokit();

  const { data } = await octokit.apps.getRepoInstallation({
    owner,
    repo,
  });

  return data.id;
}

/**
 * Fetch workflow run logs
 */
export async function getWorkflowRunLogs(
  installationId: number,
  owner: string,
  repo: string,
  runId: number,
): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);

  try {
    // Get the logs URL
    const { url } = await octokit.actions.downloadWorkflowRunLogs({
      owner,
      repo,
      run_id: runId,
    });

    // Download the logs (returns a zip file)
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // For now, return a placeholder - actual implementation would unzip and parse
    // The logs are in a zip file with one file per job
    return `Workflow run ${runId} logs (${buffer.byteLength} bytes compressed)`;
  } catch (error) {
    console.error("Failed to fetch workflow logs:", error);
    throw error;
  }
}

/**
 * Get failed workflow run details
 */
export async function getFailedWorkflowDetails(
  installationId: number,
  owner: string,
  repo: string,
  runId: number,
): Promise<{
  conclusion: string;
  failedJobs: Array<{
    name: string;
    conclusion: string;
    steps: Array<{ name: string; conclusion: string; number: number }>;
  }>;
}> {
  const octokit = await getInstallationOctokit(installationId);

  // Get workflow run
  const { data: run } = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id: runId,
  });

  // Get jobs for the run
  const { data: jobsData } = await octokit.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
  });

  const failedJobs = jobsData.jobs
    .filter((job) => job.conclusion === "failure")
    .map((job) => ({
      name: job.name,
      conclusion: job.conclusion || "unknown",
      steps: (job.steps || [])
        .filter((step) => step.conclusion === "failure")
        .map((step) => ({
          name: step.name,
          conclusion: step.conclusion || "unknown",
          number: step.number,
        })),
    }));

  return {
    conclusion: run.conclusion || "unknown",
    failedJobs,
  };
}

/**
 * Create a check run for visual testing results
 */
export async function createCheckRun(
  installationId: number,
  owner: string,
  repo: string,
  headSha: string,
  name: string,
  status: "queued" | "in_progress" | "completed",
  conclusion?: "success" | "failure" | "neutral" | "skipped",
  output?: {
    title: string;
    summary: string;
    text?: string;
    annotations?: Array<{
      path: string;
      start_line: number;
      end_line: number;
      annotation_level: "notice" | "warning" | "failure";
      message: string;
    }>;
  },
): Promise<number> {
  const octokit = await getInstallationOctokit(installationId);

  const { data } = await octokit.checks.create({
    owner,
    repo,
    head_sha: headSha,
    name,
    status,
    conclusion,
    output,
  });

  return data.id;
}

/**
 * Post a comment on a pull request
 */
export async function createPRComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<number> {
  const octokit = await getInstallationOctokit(installationId);

  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });

  return data.id;
}

/**
 * Reset the cached app Octokit (useful for testing)
 */
export function resetGitHubClient(): void {
  _appOctokit = null;
}
