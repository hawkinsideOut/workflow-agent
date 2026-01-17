/**
 * Workflow GitHub App - Main entry point and CLI
 */

import { Command } from "commander";
import pc from "picocolors";
import { startServer } from "./server.js";
import { loadEnv } from "./config/env.js";
import { manualTrigger } from "./orchestrator/auto-heal.js";
import {
  captureBaseline,
  compareWithBaseline,
  runVisualTests,
  generateTerminalSummary,
} from "./visual/index.js";
import { initDatabase } from "./db/client.js";
import {
  listBaselines,
  getRecentWebhookEvents,
  getActiveAttempts,
} from "./db/queries.js";

const program = new Command();

program
  .name("workflow-github-app")
  .description(
    "GitHub App for automated pipeline monitoring and visual testing",
  )
  .version("1.0.0");

// Server command
program
  .command("serve")
  .description("Start the webhook server")
  .option("-p, --port <port>", "Port to listen on")
  .option("--dev", "Run in development mode with smee.io")
  .action(async (options) => {
    try {
      // Override port if provided
      if (options.port) {
        process.env.PORT = options.port;
      }

      // Validate environment
      loadEnv();

      console.log(pc.cyan("Starting workflow-github-app server..."));
      await startServer();
    } catch (error) {
      console.error(pc.red("Failed to start server:"), error);
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show current status of auto-heal attempts and recent events")
  .action(async () => {
    try {
      loadEnv();
      await initDatabase();

      const activeAttempts = getActiveAttempts();
      const recentEvents = getRecentWebhookEvents(10);

      console.log(pc.cyan("\n=== Active Auto-Heal Attempts ===\n"));

      if (activeAttempts.length === 0) {
        console.log(pc.dim("  No active attempts"));
      } else {
        for (const attempt of activeAttempts) {
          console.log(
            `  ${pc.yellow(attempt.commit_sha.slice(0, 7))} - ${attempt.repo_owner}/${attempt.repo_name}`,
          );
          console.log(
            `    Attempts: ${attempt.attempt_count}, Status: ${attempt.status}`,
          );
          console.log(`    Last error: ${attempt.last_error || "N/A"}`);
          console.log("");
        }
      }

      console.log(pc.cyan("\n=== Recent Webhook Events ===\n"));

      if (recentEvents.length === 0) {
        console.log(pc.dim("  No recent events"));
      } else {
        for (const event of recentEvents) {
          const status = event.processed
            ? event.error
              ? pc.red("✗")
              : pc.green("✓")
            : pc.yellow("○");
          const repo =
            event.repo_owner && event.repo_name
              ? `${event.repo_owner}/${event.repo_name}`
              : "";
          console.log(
            `  ${status} ${event.event_type}${event.action ? `.${event.action}` : ""} ${pc.dim(repo)} ${pc.dim(event.created_at)}`,
          );
        }
      }

      console.log("");
    } catch (error) {
      console.error(pc.red("Failed to get status:"), error);
      process.exit(1);
    }
  });

// Visual testing commands
const visual = program.command("visual").description("Visual testing commands");

visual
  .command("capture")
  .description("Capture a new baseline screenshot")
  .argument("<name>", "Name for the baseline")
  .argument("<url>", "URL to capture")
  .option("-w, --width <width>", "Viewport width", "1280")
  .option("-h, --height <height>", "Viewport height", "720")
  .option("--full-page", "Capture full page")
  .option("--owner <owner>", "Repository owner")
  .option("--repo <repo>", "Repository name")
  .action(async (name, url, options) => {
    try {
      loadEnv();
      await initDatabase();

      console.log(pc.cyan(`Capturing baseline "${name}" from ${url}...`));

      const baseline = await captureBaseline(name, url, {
        screenshot: {
          width: parseInt(options.width),
          height: parseInt(options.height),
          fullPage: options.fullPage,
        },
        repo:
          options.owner && options.repo
            ? { owner: options.owner, name: options.repo }
            : undefined,
      });

      console.log(pc.green(`✓ Baseline saved to ${baseline.screenshot_path}`));
    } catch (error) {
      console.error(pc.red("Failed to capture baseline:"), error);
      process.exit(1);
    }
  });

visual
  .command("compare")
  .description("Compare a URL against its baseline")
  .argument("<name>", "Baseline name to compare against")
  .argument("<url>", "URL to compare")
  .option("--owner <owner>", "Repository owner")
  .option("--repo <repo>", "Repository name")
  .action(async (name, url, options) => {
    try {
      loadEnv();
      await initDatabase();

      console.log(pc.cyan(`Comparing ${url} against baseline "${name}"...`));

      const result = await compareWithBaseline(name, url, {
        repo:
          options.owner && options.repo
            ? { owner: options.owner, name: options.repo }
            : undefined,
      });

      if (result.hasDifferences) {
        console.log(pc.yellow(`\n⚠️  Differences detected!`));
        console.log(`Summary: ${result.summary}`);
        console.log(`Confidence: ${Math.round(result.confidence * 100)}%`);
        console.log("\nDifferences:");
        for (const diff of result.differences) {
          const icon =
            diff.severity === "critical"
              ? pc.red("●")
              : diff.severity === "major"
                ? pc.yellow("●")
                : pc.dim("●");
          console.log(`  ${icon} [${diff.area}] ${diff.description}`);
        }
        process.exit(1);
      } else {
        console.log(pc.green(`\n✓ No differences detected`));
        console.log(`Confidence: ${Math.round(result.confidence * 100)}%`);
      }
    } catch (error) {
      console.error(pc.red("Failed to compare:"), error);
      process.exit(1);
    }
  });

visual
  .command("test")
  .description("Run all visual tests for a repository")
  .option("--owner <owner>", "Repository owner")
  .option("--repo <repo>", "Repository name")
  .option("--commit <sha>", "Commit SHA for tracking")
  .action(async (options) => {
    try {
      loadEnv();
      await initDatabase();

      console.log(pc.cyan("Running visual tests..."));

      const results = await runVisualTests({
        repo:
          options.owner && options.repo
            ? { owner: options.owner, name: options.repo }
            : undefined,
        commitSha: options.commit,
      });

      console.log(generateTerminalSummary(results));

      if (results.failed.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(pc.red("Failed to run visual tests:"), error);
      process.exit(1);
    }
  });

visual
  .command("list")
  .description("List all baselines")
  .option("--owner <owner>", "Repository owner")
  .option("--repo <repo>", "Repository name")
  .action(async (options) => {
    try {
      loadEnv();
      await initDatabase();

      const baselines = listBaselines(options.owner, options.repo);

      if (baselines.length === 0) {
        console.log(pc.dim("No baselines found"));
        return;
      }

      console.log(pc.cyan("\nVisual Baselines:\n"));
      for (const baseline of baselines) {
        console.log(`  ${pc.bold(baseline.name)}`);
        console.log(`    URL: ${baseline.url}`);
        console.log(
          `    Viewport: ${baseline.viewport_width}x${baseline.viewport_height}`,
        );
        console.log(`    Path: ${baseline.screenshot_path}`);
        console.log("");
      }
    } catch (error) {
      console.error(pc.red("Failed to list baselines:"), error);
      process.exit(1);
    }
  });

// Manual trigger command
program
  .command("heal")
  .description("Manually trigger auto-heal for an error")
  .argument("<owner>", "Repository owner")
  .argument("<repo>", "Repository name")
  .argument("<commit>", "Commit SHA")
  .argument("<error>", "Error message to fix")
  .action(async (owner, repo, commit, error) => {
    try {
      loadEnv();
      await initDatabase();

      console.log(pc.cyan(`Triggering manual auto-heal...`));
      console.log(`  Repository: ${owner}/${repo}`);
      console.log(`  Commit: ${commit}`);
      console.log(`  Error: ${error}`);
      console.log("");

      await manualTrigger(owner, repo, commit, error);
    } catch (err) {
      console.error(pc.red("Auto-heal failed:"), err);
      process.exit(1);
    }
  });

program.parse();
