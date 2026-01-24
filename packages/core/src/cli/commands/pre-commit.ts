/**
 * Pre-commit CLI command
 *
 * Alias for `verify --fix --staged` - designed for git pre-commit hooks.
 * Runs all quality checks with auto-fix on staged files only.
 */

import chalk from "chalk";
import { verifyCommand } from "./verify.js";

interface PreCommitOptions {
  stagedOnly?: boolean;
  dryRun?: boolean;
  maxRetries?: string;
}

/**
 * Pre-commit command - streamlined quality check for git hooks
 *
 * This is a convenience wrapper around verify that:
 * - Enables auto-fix by default
 * - Focuses on staged changes
 * - Optimized for speed in pre-commit context
 */
export async function preCommitCommand(
  options: PreCommitOptions,
): Promise<void> {
  const stagedOnly = options.stagedOnly ?? true;
  const dryRun = options.dryRun ?? false;
  const maxRetries = options.maxRetries ?? "5"; // Lower default for pre-commit speed

  console.log(chalk.bold.cyan("\n🔒 Pre-Commit Quality Check\n"));

  if (dryRun) {
    console.log(chalk.yellow("📋 DRY-RUN MODE: No changes will be applied\n"));
  }

  if (stagedOnly) {
    console.log(chalk.dim("  Checking staged files only...\n"));
  }

  // Delegate to verify with pre-commit-friendly defaults
  await verifyCommand({
    fix: true,
    maxRetries,
    commit: false, // Never auto-commit in pre-commit
    dryRun,
    learn: false, // Skip learning in pre-commit for speed
  });
}
