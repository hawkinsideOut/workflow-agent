import chalk from "chalk";
import {
  runAllChecks,
  hasUncommittedChanges,
  stageAllChanges,
  type RunAllChecksResult,
} from "../../utils/check-runner.js";
import { execa } from "execa";
import {
  PatternStore,
  TelemetryCollector,
  ContributorManager,
  type FixPattern,
} from "@hawkinside_out/workflow-improvement-tracker";

interface VerifyOptions {
  fix?: boolean;
  maxRetries?: string;
  commit?: boolean;
  dryRun?: boolean;
  learn?: boolean;
}

/**
 * Verify command - Run all quality checks with fix-and-revalidate pattern
 *
 * Pattern: Run check → If fails, fix → Re-run ALL checks from start
 * This ensures fixes don't introduce new issues in earlier checks.
 */
export async function verifyCommand(options: VerifyOptions) {
  const cwd = process.cwd();
  const maxRetries = options.maxRetries ? parseInt(options.maxRetries, 10) : 10;
  const autoFix = options.fix ?? false;
  const shouldCommit = options.commit ?? false;
  const dryRun = options.dryRun ?? false;
  const learnFromFixes = options.learn ?? false;

  console.log(chalk.bold.cyan("\n🔍 Workflow Agent Quality Verification\n"));

  if (dryRun) {
    console.log(chalk.yellow("📋 DRY-RUN MODE: No changes will be applied\n"));
  }

  console.log(chalk.dim(`  Auto-fix: ${autoFix ? "enabled" : "disabled"}`));
  console.log(chalk.dim(`  Max retries: ${maxRetries}`));
  console.log(chalk.dim(`  Commit on success: ${shouldCommit ? "yes" : "no"}`));
  console.log(chalk.dim(`  Dry-run: ${dryRun ? "yes" : "no"}`));
  console.log(
    chalk.dim(`  Learn from fixes: ${learnFromFixes ? "yes" : "no"}`),
  );

  const startTime = Date.now();

  const result = await runAllChecks(cwd, {
    maxRetries,
    autoFix,
    dryRun,
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${"━".repeat(50)}`);

  if (result.success) {
    console.log(chalk.bold.green("\n✅ ALL QUALITY CHECKS PASSED!\n"));
    console.log(chalk.dim(`  Total time: ${totalTime}s`));
    console.log(chalk.dim(`  Validation cycles: ${result.totalAttempts}`));
    console.log(chalk.dim(`  Fixes applied: ${result.fixesApplied}`));

    // Auto-record successful fix patterns if learning is enabled
    if (learnFromFixes && result.fixesApplied > 0 && !dryRun) {
      await recordSuccessfulFixes(cwd, result);
    }

    // Handle commit if requested
    if (shouldCommit) {
      const hasChanges = await hasUncommittedChanges(cwd);

      if (hasChanges) {
        console.log(chalk.cyan("\n📦 Staging and committing changes...\n"));

        const staged = await stageAllChanges(cwd);
        if (!staged) {
          console.log(chalk.red("❌ Failed to stage changes"));
          process.exit(1);
        }

        try {
          await execa(
            "git",
            ["commit", "-m", "chore: auto-fix quality issues"],
            { cwd },
          );
          console.log(chalk.green("✅ Changes committed successfully"));
        } catch (error) {
          console.log(chalk.red("❌ Failed to commit changes"));
          console.log(chalk.dim((error as Error).message));
          process.exit(1);
        }
      } else {
        console.log(chalk.dim("\n  No changes to commit."));
      }
    }

    console.log(chalk.cyan("\n💡 Next steps:\n"));
    console.log(chalk.dim("  1. git add ."));
    console.log(
      chalk.dim('  2. git commit -m "<type>(<scope>): <description>"'),
    );
    console.log(chalk.dim("  3. git push origin <branch-name>"));
    console.log("");

    process.exit(0);
  } else {
    console.log(chalk.bold.red("\n❌ QUALITY CHECKS FAILED\n"));
    console.log(chalk.dim(`  Total time: ${totalTime}s`));
    console.log(chalk.dim(`  Validation cycles: ${result.totalAttempts}`));
    console.log(chalk.dim(`  Fixes applied: ${result.fixesApplied}`));

    if (result.pendingFixes && result.pendingFixes.length > 0) {
      console.log(chalk.yellow("\n📋 Pending fixes (dry-run):"));
      for (const fix of result.pendingFixes) {
        console.log(chalk.dim(`  • ${fix.check.displayName}: ${fix.command}`));
      }
    }

    console.log(
      chalk.yellow("\n⚠️  Please fix the errors above and run again."),
    );
    console.log(
      chalk.dim("  Run with --fix to auto-fix lint and format issues."),
    );
    console.log("");

    process.exit(1);
  }
}

// ============================================
// Auto-Record Learning Pattern
// ============================================

/**
 * Record successful fix patterns for learning
 * Called after verify succeeds with auto-fixes applied
 */
async function recordSuccessfulFixes(
  cwd: string,
  result: RunAllChecksResult,
): Promise<void> {
  try {
    // Check if telemetry is enabled
    const contributorManager = new ContributorManager(cwd);
    const telemetryEnabled = await contributorManager.isTelemetryEnabled();

    if (!telemetryEnabled) {
      // Silently skip if telemetry is disabled
      return;
    }

    const store = new PatternStore(cwd);
    const telemetry = new TelemetryCollector(cwd);

    // Get package.json to determine framework
    let framework = "unknown";
    let frameworkVersion = "0.0.0";

    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const packageJsonPath = path.join(cwd, "package.json");
      const packageJson = JSON.parse(
        await fs.promises.readFile(packageJsonPath, "utf-8"),
      );

      // Detect framework from dependencies
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (deps["next"]) {
        framework = "next";
        frameworkVersion = deps["next"].replace(/[\^~]/, "");
      } else if (deps["react"]) {
        framework = "react";
        frameworkVersion = deps["react"].replace(/[\^~]/, "");
      } else if (deps["vue"]) {
        framework = "vue";
        frameworkVersion = deps["vue"].replace(/[\^~]/, "");
      } else if (deps["express"]) {
        framework = "express";
        frameworkVersion = deps["express"].replace(/[\^~]/, "");
      }
    } catch {
      // Ignore package.json read errors
    }

    // Record telemetry for each fix applied
    if (result.appliedFixes && result.appliedFixes.length > 0) {
      console.log(
        chalk.cyan("\n📚 Recording successful fixes for learning...\n"),
      );

      for (const fix of result.appliedFixes) {
        // Create or find existing pattern for this fix type
        const patternName = `Auto-fix: ${fix.displayName}`;
        const patternId = crypto.randomUUID();

        // Check if we already have a pattern for this fix type
        const existingPatterns = await store.listFixPatterns({
          tags: [{ category: "tool", name: fix.checkName }],
        });

        if (
          existingPatterns.success &&
          existingPatterns.data &&
          existingPatterns.data.length > 0
        ) {
          // Update metrics on existing pattern
          const existingPattern = existingPatterns.data[0];
          await store.updateFixMetrics(existingPattern.id, true);
          await telemetry.recordSuccess(
            existingPattern.id,
            "fix",
            framework,
            frameworkVersion,
          );
          console.log(chalk.dim(`  ✓ Updated: ${existingPattern.name}`));
        } else {
          // Create new pattern
          const now = new Date().toISOString();
          const newPattern: FixPattern = {
            id: patternId,
            name: patternName,
            description: `Auto-fix pattern for ${fix.displayName} using command: ${fix.command}`,
            category: "config",
            tags: [
              { category: "tool", name: fix.checkName },
              { category: "framework", name: framework },
            ],
            trigger: {
              errorPattern: fix.checkName,
              errorMessage: `${fix.checkName} check failed`,
              filePattern: "**/*",
            },
            solution: {
              type: "command",
              steps: [
                {
                  order: 1,
                  action: "run",
                  target: fix.command,
                  description: `Run ${fix.command}`,
                },
              ],
            },
            compatibility: {
              framework,
              frameworkVersion: `>=${frameworkVersion}`,
              runtime: "node",
              runtimeVersion: ">=18.0.0",
              dependencies: [],
            },
            metrics: {
              applications: 1,
              successes: 1,
              failures: 0,
              successRate: 100,
              lastUsed: now,
              lastSuccessful: now,
            },
            source: "verify-fix",
            isPrivate: true,
            createdAt: now,
            updatedAt: now,
          };

          const saveResult = await store.saveFixPattern(newPattern);
          if (saveResult.success) {
            await telemetry.recordSuccess(
              patternId,
              "fix",
              framework,
              frameworkVersion,
            );
            console.log(chalk.dim(`  ✓ Recorded: ${patternName}`));
            console.log(chalk.dim(`    Path: .workflow/patterns/fixes/${newPattern.id}.json`));
          }
        }
      }

      console.log(
        chalk.dim(`\n  Use 'workflow learn:list' to see recorded patterns.`),
      );
    }
  } catch (error) {
    // Don't fail the verify command if learning fails
    console.log(
      chalk.dim(
        `\n  Note: Could not record learning patterns: ${(error as Error).message}`,
      ),
    );
  }
}
