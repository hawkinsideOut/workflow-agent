/**
 * Check Runner - Orchestrates quality checks with fix-and-revalidate pattern
 *
 * Pattern: Run check → If fails, fix → Re-run ALL checks from start
 * This ensures fixes don't introduce new issues in earlier checks.
 */

import { execa, type ExecaError } from "execa";
import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as p from "@clack/prompts";
import {
  detectAllPlatforms,
  type FrameworkType,
  type PlatformDetectionResult,
} from "./auto-setup.js";

export interface CheckDefinition {
  name: string;
  displayName: string;
  command: string;
  args: string[];
  fixCommand?: string;
  fixArgs?: string[];
  canAutoFix: boolean;
  /** The npm script name this check depends on (e.g., "typecheck", "lint") */
  requiredScript?: string;
  /** Fallback command if the script doesn't exist (e.g., ["tsc", "--noEmit"]) */
  fallbackCommand?: string[];
}

export interface CheckResult {
  check: CheckDefinition;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  /** Whether the check was skipped (e.g., no files found) */
  skipped?: boolean;
  /** Reason the check was skipped */
  skipReason?: string;
}

export interface AppliedFix {
  checkName: string;
  displayName: string;
  command: string;
  timestamp: Date;
}

export interface RunAllChecksResult {
  success: boolean;
  results: CheckResult[];
  totalAttempts: number;
  fixesApplied: number;
  appliedFixes: AppliedFix[];
  pendingFixes?: Array<{ check: CheckDefinition; command: string }>;
}

export type ProgressType = "info" | "success" | "error" | "warning";

export interface CheckRunnerOptions {
  maxRetries?: number;
  autoFix?: boolean;
  dryRun?: boolean;
  onProgress?: (message: string, type: ProgressType) => void;
  /** Whether to include platform-specific checks (default: true) */
  includePlatformChecks?: boolean;
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
    requiredScript: "typecheck",
    fallbackCommand: ["tsc", "--noEmit"],
  },
  {
    name: "lint",
    displayName: "Lint",
    command: "pnpm",
    args: ["lint"],
    fixCommand: "pnpm",
    fixArgs: ["lint", "--fix"],
    canAutoFix: true,
    requiredScript: "lint",
  },
  {
    name: "format",
    displayName: "Format",
    command: "pnpm",
    args: ["format", "--check"],
    fixCommand: "pnpm",
    fixArgs: ["format"],
    canAutoFix: true,
    requiredScript: "format",
  },
  {
    name: "test",
    displayName: "Tests",
    command: "pnpm",
    args: ["test"],
    canAutoFix: false, // Tests need manual/LLM fix
    requiredScript: "test",
  },
  {
    name: "build",
    displayName: "Build",
    command: "pnpm",
    args: ["build"],
    canAutoFix: false, // Build errors need manual/LLM fix
    requiredScript: "build",
  },
];

// ============================================================================
// Platform-Specific Checks
// ============================================================================

/**
 * Platform types that have specific checks
 */
export type PlatformType =
  | "shopify-theme"
  | "shopify-hydrogen"
  | "wordpress"
  | "magento"
  | "woocommerce";

/**
 * Platform CLI installation configuration
 */
export interface PlatformCLIConfig {
  /** The CLI command to check for */
  cli: string;
  /** Command to install the CLI */
  install: string;
  /** Whether this platform requires Composer (PHP package manager) */
  requiresComposer: boolean;
  /** Human-readable platform name */
  displayName: string;
}

/**
 * Platform check definition extending CheckDefinition
 */
export interface PlatformCheckDefinition extends CheckDefinition {
  /** The platform this check applies to */
  platform: PlatformType;
}

/**
 * CLI installation commands for each platform
 */
export const PLATFORM_CLI_INSTALL: Record<PlatformType, PlatformCLIConfig> = {
  "shopify-theme": {
    cli: "shopify",
    install: "npm install -g @shopify/cli @shopify/theme",
    requiresComposer: false,
    displayName: "Shopify Theme",
  },
  "shopify-hydrogen": {
    cli: "shopify",
    install: "npm install -g @shopify/cli",
    requiresComposer: false,
    displayName: "Shopify Hydrogen",
  },
  wordpress: {
    cli: "phpcs",
    install:
      "composer global require squizlabs/php_codesniffer wp-coding-standards/wpcs && phpcs --config-set installed_paths $(composer global config home)/vendor/wp-coding-standards/wpcs",
    requiresComposer: true,
    displayName: "WordPress",
  },
  magento: {
    cli: "phpcs",
    install:
      "composer global require squizlabs/php_codesniffer magento/magento-coding-standard && phpcs --config-set installed_paths $(composer global config home)/vendor/magento/magento-coding-standard",
    requiresComposer: true,
    displayName: "Magento",
  },
  woocommerce: {
    cli: "phpcs",
    install:
      "composer global require squizlabs/php_codesniffer automattic/woocommerce-sniffs && phpcs --config-set installed_paths $(composer global config home)/vendor/automattic/woocommerce-sniffs",
    requiresComposer: true,
    displayName: "WooCommerce",
  },
};

/**
 * Platform-specific quality checks
 */
export const PLATFORM_CHECKS: PlatformCheckDefinition[] = [
  {
    platform: "shopify-theme",
    name: "shopify-theme-check",
    displayName: "Shopify Theme Check",
    command: "shopify",
    args: ["theme", "check"],
    canAutoFix: false,
  },
  {
    platform: "shopify-hydrogen",
    name: "shopify-hydrogen-check",
    displayName: "Shopify Hydrogen Check",
    command: "shopify",
    args: ["hydrogen", "check"],
    canAutoFix: false,
  },
  {
    platform: "wordpress",
    name: "wordpress-phpcs",
    displayName: "WordPress Coding Standards",
    command: "phpcs",
    args: ["--standard=WordPress", "."],
    fixCommand: "phpcbf",
    fixArgs: ["--standard=WordPress", "."],
    canAutoFix: true,
  },
  {
    platform: "magento",
    name: "magento-phpcs",
    displayName: "Magento Coding Standards",
    command: "phpcs",
    args: ["--standard=Magento2", "."],
    fixCommand: "phpcbf",
    fixArgs: ["--standard=Magento2", "."],
    canAutoFix: true,
  },
  {
    platform: "woocommerce",
    name: "woocommerce-phpcs",
    displayName: "WooCommerce Coding Standards",
    command: "phpcs",
    args: ["--standard=WooCommerce-Core", "."],
    fixCommand: "phpcbf",
    fixArgs: ["--standard=WooCommerce-Core", "."],
    canAutoFix: true,
  },
];

/**
 * Get available scripts from the target project's package.json
 */
export function getAvailableScripts(cwd: string): Set<string> {
  const packageJsonPath = join(cwd, "package.json");

  if (!existsSync(packageJsonPath)) {
    return new Set();
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return new Set(Object.keys(packageJson.scripts || {}));
  } catch {
    return new Set();
  }
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execa("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get applicable checks for the target project
 * Filters out checks for scripts that don't exist, uses fallbacks when available
 */
export async function getApplicableChecks(
  cwd: string,
): Promise<CheckDefinition[]> {
  const availableScripts = getAvailableScripts(cwd);
  const applicableChecks: CheckDefinition[] = [];

  for (const check of QUALITY_CHECKS) {
    // If no required script, always include
    if (!check.requiredScript) {
      applicableChecks.push(check);
      continue;
    }

    // If the script exists in package.json, use the pnpm command
    if (availableScripts.has(check.requiredScript)) {
      applicableChecks.push(check);
      continue;
    }

    // If there's a fallback command and it exists, use that
    if (check.fallbackCommand && check.fallbackCommand.length > 0) {
      const fallbackCmd = check.fallbackCommand[0];
      if (await commandExists(fallbackCmd)) {
        applicableChecks.push({
          ...check,
          command: fallbackCmd,
          args: check.fallbackCommand.slice(1),
        });
        continue;
      }
    }

    // Script doesn't exist and no valid fallback - skip this check
    // (will be logged as skipped in runAllChecks)
  }

  return applicableChecks;
}

// ============================================================================
// Platform Check Utilities
// ============================================================================

/**
 * Check if Composer is installed (required for PHP-based platforms)
 * If not installed, shows OS-specific installation instructions and exits
 */
export async function ensureComposer(): Promise<void> {
  const hasComposer = await commandExists("composer");

  if (!hasComposer) {
    console.log(chalk.red("\n❌ Composer is required but not installed.\n"));
    console.log(chalk.yellow("Please install Composer for your platform:\n"));

    // Detect OS and show relevant instructions
    const platform = process.platform;

    if (platform === "darwin") {
      console.log(chalk.cyan("  macOS (Homebrew):"));
      console.log(chalk.dim("    brew install composer\n"));
    } else if (platform === "linux") {
      console.log(chalk.cyan("  Ubuntu/Debian:"));
      console.log(chalk.dim("    sudo apt install composer\n"));
      console.log(chalk.cyan("  Fedora/CentOS:"));
      console.log(chalk.dim("    sudo dnf install composer\n"));
      console.log(chalk.cyan("  Arch Linux:"));
      console.log(chalk.dim("    sudo pacman -S composer\n"));
    } else if (platform === "win32") {
      console.log(chalk.cyan("  Windows (Scoop):"));
      console.log(chalk.dim("    scoop install composer\n"));
      console.log(chalk.cyan("  Windows (Chocolatey):"));
      console.log(chalk.dim("    choco install composer\n"));
    }

    console.log(chalk.cyan("  Or download from:"));
    console.log(chalk.dim("    https://getcomposer.org/download/\n"));

    process.exit(1);
  }
}

/**
 * Prompt user to choose a platform when multiple are detected
 */
export async function promptPlatformChoice(
  detected: FrameworkType[],
): Promise<FrameworkType> {
  // Filter to only platform types we have checks for
  const platformTypes = detected.filter((d): d is PlatformType =>
    Object.keys(PLATFORM_CLI_INSTALL).includes(d),
  );

  if (platformTypes.length === 0) {
    return detected[0] || "unknown";
  }

  if (platformTypes.length === 1) {
    return platformTypes[0];
  }

  // Multiple platforms detected - ask user
  console.log(
    chalk.yellow("\n🔍 Multiple platforms detected in this project:\n"),
  );

  const options = platformTypes.map((pt) => ({
    value: pt,
    label: PLATFORM_CLI_INSTALL[pt].displayName,
  }));

  const choice = await p.select({
    message: "Which platform would you like to run checks for?",
    options,
  });

  if (p.isCancel(choice)) {
    console.log(chalk.yellow("\n⚠️  Platform check cancelled."));
    process.exit(0);
  }

  return choice as FrameworkType;
}

/**
 * Ensure the platform CLI is installed
 * If not, automatically installs it after showing the command
 */
export async function ensurePlatformCLI(platform: PlatformType): Promise<void> {
  const config = PLATFORM_CLI_INSTALL[platform];

  // Check Composer requirement first
  if (config.requiresComposer) {
    await ensureComposer();
  }

  // Check if CLI exists
  const hasCLI = await commandExists(config.cli);

  if (!hasCLI) {
    console.log(
      chalk.yellow(
        `\n📦 ${config.displayName} CLI (${config.cli}) not found. Installing...\n`,
      ),
    );
    console.log(chalk.dim(`  Running: ${config.install}\n`));

    try {
      // Run the install command
      await execa("sh", ["-c", config.install], {
        stdio: "inherit",
      });

      // Verify installation
      const nowHasCLI = await commandExists(config.cli);
      if (!nowHasCLI) {
        console.log(
          chalk.red(
            `\n❌ Failed to install ${config.cli}. Please install manually:\n`,
          ),
        );
        console.log(chalk.dim(`  ${config.install}\n`));
        process.exit(1);
      }

      console.log(
        chalk.green(`\n✅ ${config.displayName} CLI installed successfully.\n`),
      );
    } catch (error) {
      console.log(chalk.red(`\n❌ Failed to install ${config.cli}:\n`));
      console.log(chalk.dim(`  ${(error as Error).message}\n`));
      console.log(chalk.yellow("Please install manually:\n"));
      console.log(chalk.dim(`  ${config.install}\n`));
      process.exit(1);
    }
  }
}

/**
 * Get platform-specific checks for the detected platform(s)
 * Handles multi-platform detection, user prompts, and CLI installation
 */
export async function getPlatformChecks(
  cwd: string,
): Promise<PlatformCheckDefinition[]> {
  // Detect all platforms
  const detection: PlatformDetectionResult = await detectAllPlatforms(cwd);

  // Filter to platforms we have checks for
  const platformsWithChecks = detection.detected.filter(
    (d): d is PlatformType => Object.keys(PLATFORM_CLI_INSTALL).includes(d),
  );

  if (platformsWithChecks.length === 0) {
    return [];
  }

  // If multiple platforms, prompt user to choose
  let selectedPlatform: PlatformType;
  if (platformsWithChecks.length === 1) {
    selectedPlatform = platformsWithChecks[0];
  } else {
    const choice = await promptPlatformChoice(detection.detected);
    if (!Object.keys(PLATFORM_CLI_INSTALL).includes(choice)) {
      return [];
    }
    selectedPlatform = choice as PlatformType;
  }

  // Ensure CLI is installed
  await ensurePlatformCLI(selectedPlatform);

  // Return checks for the selected platform
  return PLATFORM_CHECKS.filter((check) => check.platform === selectedPlatform);
}

/**
 * Patterns that indicate a check should be skipped rather than failed.
 * These are non-error conditions where the tool exits non-zero but nothing is wrong.
 */
export const SKIPPABLE_ERROR_PATTERNS: Array<{
  pattern: RegExp;
  reason: string;
}> = [
  // ESLint no-files patterns
  {
    pattern: /No files matching the pattern .* were found/i,
    reason: "No files found matching the lint pattern",
  },
  {
    pattern: /No files matching .* were found/i,
    reason: "No files found matching the pattern",
  },
  // TypeScript no-files pattern
  {
    pattern: /No inputs were found in config file/i,
    reason: "No TypeScript files found",
  },
  {
    pattern: /No files matching the pattern .* are present/i,
    reason: "No files present matching the pattern",
  },
  // Prettier unsupported file type patterns
  {
    pattern: /No parser could be inferred for file/i,
    reason: "File type not supported by Prettier (add to .prettierignore)",
  },
  {
    pattern: /UndefinedParserError/i,
    reason: "Prettier cannot parse this file type",
  },
];

/**
 * Check if an error output matches a skippable error pattern.
 * @returns The skip reason if matched, undefined otherwise.
 */
export function isSkippableError(output: string): string | undefined {
  for (const { pattern, reason } of SKIPPABLE_ERROR_PATTERNS) {
    if (pattern.test(output)) {
      return reason;
    }
  }
  return undefined;
}

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
      // Check if this is a skippable error (e.g., "no files found")
      const combinedOutput = result.all || result.stderr || "";
      const skipReason = isSkippableError(combinedOutput);

      if (skipReason) {
        return {
          check,
          success: true, // Treat as success since it's not a real failure
          output: result.all || "",
          duration,
          skipped: true,
          skipReason,
        };
      }

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
): Promise<{
  success: boolean;
  output: string;
  skipped?: boolean;
  skipReason?: string;
}> {
  if (!check.canAutoFix || !check.fixCommand) {
    return { success: false, output: "Check does not support auto-fix" };
  }

  try {
    const result = await execa(check.fixCommand, check.fixArgs || [], {
      cwd,
      reject: false,
      all: true,
    });

    if (result.exitCode === 0) {
      return {
        success: true,
        output: result.all || "",
      };
    }

    // Check if this is a skippable error (e.g., "no files found")
    const combinedOutput = result.all || result.stderr || "";
    const skipReason = isSkippableError(combinedOutput);

    if (skipReason) {
      return {
        success: true, // Treat as success since it's not a real failure
        output: result.all || "",
        skipped: true,
        skipReason,
      };
    }

    return {
      success: false,
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
 * Run platform-specific checks after standard checks pass
 * Returns results for each platform check run
 */
async function runPlatformChecks(
  cwd: string,
  log: (message: string, type: ProgressType) => void,
  autoFix: boolean,
  dryRun: boolean,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  try {
    const platformChecks = await getPlatformChecks(cwd);

    if (platformChecks.length === 0) {
      return results;
    }

    log(`\n${"━".repeat(50)}`, "info");
    log(`🔧 Platform-Specific Checks`, "info");
    log(`${"━".repeat(50)}\n`, "info");

    for (let i = 0; i < platformChecks.length; i++) {
      const check = platformChecks[i];
      const stepNum = i + 1;
      const totalSteps = platformChecks.length;

      log(
        `📋 Platform ${stepNum}/${totalSteps}: ${check.displayName}...`,
        "info",
      );

      const result = await runCheck(check, cwd);
      results.push(result);

      if (result.success) {
        log(`✅ ${check.displayName} passed (${result.duration}ms)`, "success");
      } else {
        log(`❌ ${check.displayName} failed`, "error");

        // Try to auto-fix if possible
        if (autoFix && check.canAutoFix && check.fixCommand) {
          if (dryRun) {
            log(
              `🔧 [DRY-RUN] Would run: ${formatFixCommand(check)}`,
              "warning",
            );
            continue;
          }

          log(`🔧 Attempting auto-fix for ${check.displayName}...`, "warning");
          const fixResult = await applyFix(check, cwd);

          if (fixResult.success) {
            log(`✨ Auto-fix applied for ${check.displayName}`, "success");
            // Re-run the check after fix
            const reResult = await runCheck(check, cwd);
            results[results.length - 1] = reResult;

            if (reResult.success) {
              log(`✅ ${check.displayName} now passes`, "success");
            } else {
              log(`⚠️  ${check.displayName} still failing after fix`, "error");
            }
          } else {
            log(`⚠️  Auto-fix failed for ${check.displayName}`, "error");
          }
        } else if (!check.canAutoFix) {
          log(`⚠️  ${check.displayName} requires manual fix`, "error");
        }

        // Show error preview
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
      }
    }
  } catch (error) {
    // Platform check errors should not crash the entire verification
    log(`\n⚠️  Platform check error: ${(error as Error).message}`, "warning");
  }

  return results;
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
    includePlatformChecks = true,
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
  const appliedFixes: AppliedFix[] = [];
  const pendingFixes: Array<{ check: CheckDefinition; command: string }> = [];

  // Get applicable checks for this project (filters out missing scripts)
  const applicableChecks = await getApplicableChecks(cwd);

  // Log skipped checks
  const skippedChecks = QUALITY_CHECKS.filter(
    (qc) => !applicableChecks.some((ac) => ac.name === qc.name),
  );
  if (skippedChecks.length > 0) {
    log(
      `\n⏭️  Skipping checks (scripts not found): ${skippedChecks.map((c) => c.displayName).join(", ")}`,
      "warning",
    );
  }

  if (applicableChecks.length === 0) {
    log(
      `\n⚠️  No applicable checks found. Add scripts to package.json: typecheck, lint, format, test, build`,
      "warning",
    );
    return {
      success: true,
      results: [],
      totalAttempts: 0,
      fixesApplied: 0,
      appliedFixes: [],
    };
  }

  while (attempt < maxRetries) {
    attempt++;

    log(`\n${"━".repeat(50)}`, "info");
    log(`🔄 Validation Cycle ${attempt}/${maxRetries}`, "info");
    log(`${"━".repeat(50)}\n`, "info");

    const results: CheckResult[] = [];
    let allPassed = true;
    let fixAppliedThisCycle = false;

    // Run each check in order
    for (let i = 0; i < applicableChecks.length; i++) {
      const check = applicableChecks[i];
      const stepNum = i + 1;
      const totalSteps = applicableChecks.length;

      log(`📋 Step ${stepNum}/${totalSteps}: ${check.displayName}...`, "info");

      const result = await runCheck(check, cwd);
      results.push(result);

      if (result.success) {
        if (result.skipped) {
          log(
            `⏭️  ${check.displayName} skipped: ${result.skipReason} (${result.duration}ms)`,
            "warning",
          );
        } else {
          log(
            `✅ ${check.displayName} passed (${result.duration}ms)`,
            "success",
          );
        }
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
            if (fixResult.skipped) {
              // The fix command also returned "no files found" - treat as skip
              log(
                `⏭️  ${check.displayName} skipped: ${fixResult.skipReason}`,
                "warning",
              );
              // Update the result to reflect it was skipped, not failed
              results[results.length - 1] = {
                ...results[results.length - 1],
                success: true,
                skipped: true,
                skipReason: fixResult.skipReason,
              };
              allPassed = true;
              // Continue to next check
              continue;
            }
            log(`✨ Auto-fix applied for ${check.displayName}`, "success");
            fixesApplied++;
            appliedFixes.push({
              checkName: check.name,
              displayName: check.displayName,
              command: formatFixCommand(check),
              timestamp: new Date(),
            });
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
              appliedFixes,
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
              appliedFixes,
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
        appliedFixes: [],
        pendingFixes,
      };
    }

    // If all checks passed, we're done!
    if (allPassed) {
      // Run platform-specific checks if enabled
      if (includePlatformChecks) {
        const platformCheckResults = await runPlatformChecks(
          cwd,
          log,
          autoFix,
          dryRun,
        );

        if (platformCheckResults.length > 0) {
          const platformFailed = platformCheckResults.some((r) => !r.success);

          if (platformFailed) {
            return {
              success: false,
              results: [...results, ...platformCheckResults],
              totalAttempts: attempt,
              fixesApplied,
              appliedFixes,
            };
          }

          // Add platform results to overall results
          results.push(...platformCheckResults);
        }
      }

      return {
        success: true,
        results,
        totalAttempts: attempt,
        fixesApplied,
        appliedFixes,
      };
    }

    // If no fix was applied this cycle but we still failed, we're stuck
    if (!fixAppliedThisCycle) {
      return {
        success: false,
        results,
        totalAttempts: attempt,
        fixesApplied,
        appliedFixes,
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
    appliedFixes,
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
