import chalk from "chalk";
import {
  runAllChecks,
  hasUncommittedChanges,
  stageAllChanges,
} from "../../utils/check-runner.js";
import { execa } from "execa";

interface VerifyOptions {
  fix?: boolean;
  maxRetries?: string;
  commit?: boolean;
  dryRun?: boolean;
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

  console.log(chalk.bold.cyan("\n🔍 Workflow Agent Quality Verification\n"));

  if (dryRun) {
    console.log(chalk.yellow("📋 DRY-RUN MODE: No changes will be applied\n"));
  }

  console.log(chalk.dim(`  Auto-fix: ${autoFix ? "enabled" : "disabled"}`));
  console.log(chalk.dim(`  Max retries: ${maxRetries}`));
  console.log(chalk.dim(`  Commit on success: ${shouldCommit ? "yes" : "no"}`));
  console.log(chalk.dim(`  Dry-run: ${dryRun ? "yes" : "no"}`));

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
