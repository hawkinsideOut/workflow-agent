/**
 * Check Runner - Orchestrates quality checks with fix-and-revalidate pattern
 *
 * Pattern: Run check → If fails, fix → Re-run ALL checks from start
 * This ensures fixes don't introduce new issues in earlier checks.
 */

import { execa, type ExecaError } from "execa";
import chalk from "chalk";

export interface CheckDefinition {
  name: string;
  displayName: string;
  command: string;
  args: string[];
  fixCommand?: string;
  fixArgs?: string[];
  canAutoFix: boolean;
}

export interface CheckResult {
  check: CheckDefinition;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface RunAllChecksResult {
  success: boolean;
  results: CheckResult[];
  totalAttempts: number;
  fixesApplied: number;
  pendingFixes?: Array<{ check: CheckDefinition; command: string }>;
}

export type ProgressType = "info" | "success" | "error" | "warning";

export interface CheckRunnerOptions {
  maxRetries?: number;
  autoFix?: boolean;
  dryRun?: boolean;
  onProgress?: (message: string, type: ProgressType) => void;
}

/**
 * Standard quality checks in recommended order
 * Order: typecheck → lint → format → test → build
 * Type errors cascade, so we fix them first
 */
export const QUALITY_CHECKS: CheckDefinition[] = [
  {
    name: "typecheck",
    displayName: "Type Check",
    command: "pnpm",
    args: ["typecheck"],
    canAutoFix: false, // TypeScript errors need manual/LLM fix
  },
  {
    name: "lint",
    displayName: "Lint",
    command: "pnpm",
    args: ["lint"],
    fixCommand: "pnpm",
    fixArgs: ["lint", "--fix"],
    canAutoFix: true,
  },
  {
    name: "format",
    displayName: "Format",
    command: "pnpm",
    args: ["format", "--check"],
    fixCommand: "pnpm",
    fixArgs: ["format"],
    canAutoFix: true,
  },
  {
    name: "test",
    displayName: "Tests",
    command: "pnpm",
    args: ["test"],
    canAutoFix: false, // Tests need manual/LLM fix
  },
  {
    name: "build",
    displayName: "Build",
    command: "pnpm",
    args: ["build"],
    canAutoFix: false, // Build errors need manual/LLM fix
  },
];

/**
 * Run a single check
 */
export async function runCheck(
  check: CheckDefinition,
  cwd: string,
): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const result = await execa(check.command, check.args, {
      cwd,
      reject: false,
      all: true,
    });

    const duration = Date.now() - startTime;

    if (result.exitCode === 0) {
      return {
        check,
        success: true,
        output: result.all || "",
        duration,
      };
    } else {
      return {
        check,
        success: false,
        output: result.all || "",
        error: result.stderr || result.all || "Check failed",
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const execaError = error as ExecaError;

    return {
      check,
      success: false,
      output: execaError.all?.toString() || execaError.message || "",
      error: execaError.message,
      duration,
    };
  }
}

/**
 * Apply fix for a check that supports auto-fix
 */
export async function applyFix(
  check: CheckDefinition,
  cwd: string,
): Promise<{ success: boolean; output: string }> {
  if (!check.canAutoFix || !check.fixCommand) {
    return { success: false, output: "Check does not support auto-fix" };
  }

  try {
    const result = await execa(check.fixCommand, check.fixArgs || [], {
      cwd,
      reject: false,
      all: true,
    });

    return {
      success: result.exitCode === 0,
      output: result.all || "",
    };
  } catch (error) {
    const execaError = error as ExecaError;
    return {
      success: false,
      output: execaError.message,
    };
  }
}

/**
 * Format a fix command for display
 */
function formatFixCommand(check: CheckDefinition): string {
  if (!check.fixCommand) return "";
  return `${check.fixCommand} ${(check.fixArgs || []).join(" ")}`;
}

/**
 * Run all quality checks with fix-and-revalidate pattern
 *
 * When a check fails and can be auto-fixed:
 * 1. Apply the fix
 * 2. Re-run ALL checks from the beginning
 * 3. Repeat until all pass or max retries reached
 *
 * @param cwd - Working directory
 * @param options - Configuration options
 */
export async function runAllChecks(
  cwd: string,
  options: CheckRunnerOptions = {},
): Promise<RunAllChecksResult> {
  const {
    maxRetries = 10,
    autoFix = true,
    dryRun = false,
    onProgress,
  } = options;

  const log = (message: string, type: ProgressType = "info") => {
    if (onProgress) {
      onProgress(message, type);
    } else {
      // Default console output with colors
      switch (type) {
        case "success":
          console.log(chalk.green(message));
          break;
        case "error":
          console.log(chalk.red(message));
          break;
        case "warning":
          console.log(chalk.yellow(message));
          break;
        default:
          console.log(message);
      }
    }
  };

  let attempt = 0;
  let fixesApplied = 0;
  const pendingFixes: Array<{ check: CheckDefinition; command: string }> = [];

  while (attempt < maxRetries) {
    attempt++;

    log(`\n${"━".repeat(50)}`, "info");
    log(`🔄 Validation Cycle ${attempt}/${maxRetries}`, "info");
    log(`${"━".repeat(50)}\n`, "info");

    const results: CheckResult[] = [];
    let allPassed = true;
    let fixAppliedThisCycle = false;

    // Run each check in order
    for (let i = 0; i < QUALITY_CHECKS.length; i++) {
      const check = QUALITY_CHECKS[i];
      const stepNum = i + 1;
      const totalSteps = QUALITY_CHECKS.length;

      log(`📋 Step ${stepNum}/${totalSteps}: ${check.displayName}...`, "info");

      const result = await runCheck(check, cwd);
      results.push(result);

      if (result.success) {
        log(`✅ ${check.displayName} passed (${result.duration}ms)`, "success");
      } else {
        allPassed = false;
        log(`❌ ${check.displayName} failed`, "error");

        // Try to auto-fix if possible
        if (autoFix && check.canAutoFix && check.fixCommand) {
          if (dryRun) {
            // In dry-run mode, just record what would be fixed
            log(
              `🔧 [DRY-RUN] Would run: ${formatFixCommand(check)}`,
              "warning",
            );
            pendingFixes.push({ check, command: formatFixCommand(check) });

            // Continue to next check to show all issues
            continue;
          }

          log(`🔧 Attempting auto-fix for ${check.displayName}...`, "warning");

          const fixResult = await applyFix(check, cwd);

          if (fixResult.success) {
            log(`✨ Auto-fix applied for ${check.displayName}`, "success");
            fixesApplied++;
            fixAppliedThisCycle = true;

            // IMPORTANT: Re-run ALL checks from the beginning
            log(
              `\n🔄 Fix applied - restarting all checks to verify...`,
              "warning",
            );
            break; // Exit the for loop to restart from the beginning
          } else {
            log(`⚠️  Auto-fix failed for ${check.displayName}`, "error");
            log(`   Manual intervention required`, "error");

            // Show error details
            if (result.error) {
              const errorPreview = result.error.slice(0, 500);
              log(`\n${chalk.dim(errorPreview)}`, "error");
              if (result.error.length > 500) {
                log(
                  chalk.dim(
                    `... (${result.error.length - 500} more characters)`,
                  ),
                  "error",
                );
              }
            }

            return {
              success: false,
              results,
              totalAttempts: attempt,
              fixesApplied,
            };
          }
        } else {
          // Cannot auto-fix this check
          if (check.canAutoFix) {
            log(
              `⚠️  ${check.displayName} can be fixed with: ${formatFixCommand(check)}`,
              "warning",
            );
          } else {
            log(`⚠️  ${check.displayName} requires manual fix`, "error");
          }

          // Show error details
          if (result.error) {
            const errorPreview = result.error.slice(0, 500);
            log(`\n${chalk.dim(errorPreview)}`, "error");
            if (result.error.length > 500) {
              log(
                chalk.dim(`... (${result.error.length - 500} more characters)`),
                "error",
              );
            }
          }

          if (!dryRun) {
            return {
              success: false,
              results,
              totalAttempts: attempt,
              fixesApplied,
            };
          }
        }
      }
    }

    // Handle dry-run completion
    if (dryRun && pendingFixes.length > 0) {
      log(`\n${"━".repeat(50)}`, "info");
      log(`📋 DRY-RUN SUMMARY`, "info");
      log(`${"━".repeat(50)}`, "info");
      log(`\nThe following fixes would be applied:`, "warning");
      for (const fix of pendingFixes) {
        log(`  • ${fix.check.displayName}: ${fix.command}`, "info");
      }
      log(`\nRun without --dry-run to apply fixes.`, "info");

      return {
        success: false,
        results,
        totalAttempts: attempt,
        fixesApplied: 0,
        pendingFixes,
      };
    }

    // If all checks passed, we're done!
    if (allPassed) {
      return {
        success: true,
        results,
        totalAttempts: attempt,
        fixesApplied,
      };
    }

    // If no fix was applied this cycle but we still failed, we're stuck
    if (!fixAppliedThisCycle) {
      return {
        success: false,
        results,
        totalAttempts: attempt,
        fixesApplied,
      };
    }

    // Otherwise, continue to next cycle (fix was applied, need to re-verify)
  }

  // Max retries exceeded
  log(`\n❌ Maximum retries (${maxRetries}) exceeded`, "error");

  return {
    success: false,
    results: [],
    totalAttempts: attempt,
    fixesApplied,
  };
}

/**
 * Check if there are uncommitted changes in git
 */
export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  try {
    const result = await execa("git", ["status", "--porcelain"], { cwd });
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Stage all changes in git
 */
export async function stageAllChanges(cwd: string): Promise<boolean> {
  try {
    await execa("git", ["add", "-A"], { cwd });
    return true;
  } catch {
    return false;
  }
}
