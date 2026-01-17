/**
 * Auto-Setup Command
 *
 * Analyzes the project, shows an audit report of what will change,
 * and applies all setup configurations with batched dependency installation.
 *
 * Usage:
 *   workflow-agent auto-setup          # Interactive mode
 *   workflow-agent auto-setup --yes    # Auto-approve all
 *   workflow-agent auto-setup --audit  # Show report only (dry run)
 */

import * as p from "@clack/prompts";
import chalk from "chalk";
import {
  generateAuditReport,
  runAllSetups,
  type AuditReport,
} from "../../utils/auto-setup.js";

export interface AutoSetupOptions {
  yes?: boolean;
  audit?: boolean;
}

export async function autoSetupCommand(options: AutoSetupOptions) {
  console.log(chalk.bold.cyan("\n🔧 Workflow Agent Auto-Setup\n"));

  const cwd = process.cwd();

  // Generate audit report
  const spinner = p.spinner();
  spinner.start("Analyzing project...");

  let report: AuditReport;
  try {
    report = await generateAuditReport(cwd);
    spinner.stop("✓ Project analysis complete");
  } catch (error) {
    spinner.stop("✗ Failed to analyze project");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }

  // Display audit report
  console.log("\n" + formatAuditReportColored(report));

  // Exit early if audit mode
  if (options.audit) {
    console.log(chalk.dim("\n--audit mode: No changes applied.\n"));
    return;
  }

  // Check if there are any changes to make
  if (report.totalChanges === 0 && report.allDevDependencies.length === 0) {
    p.outro(chalk.green("✓ Project is already fully configured!"));
    return;
  }

  // Confirm unless --yes
  if (!options.yes) {
    const shouldProceed = await p.confirm({
      message: `Apply ${report.totalChanges} changes and install ${report.allDevDependencies.length} packages?`,
      initialValue: true,
    });

    if (p.isCancel(shouldProceed) || !shouldProceed) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }
  } else {
    console.log(chalk.dim("\n--yes mode: Auto-approving all changes.\n"));
  }

  // Run all setups
  console.log("");
  const setupSpinner = p.spinner();
  const stepMessages: string[] = [];

  const results = await runAllSetups(cwd, (step, status) => {
    if (status === "start") {
      setupSpinner.start(step);
    } else if (status === "done") {
      setupSpinner.stop(`✓ ${step}`);
      stepMessages.push(`✓ ${step}`);
    } else {
      setupSpinner.stop(`✗ ${step}`);
      stepMessages.push(`✗ ${step}`);
    }
  });

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log("");

  if (failCount === 0) {
    p.outro(
      chalk.green(
        `✓ Auto-setup complete! (${successCount} configurations applied)`,
      ),
    );
  } else {
    p.outro(
      chalk.yellow(
        `⚠ Setup completed with issues: ${successCount} succeeded, ${failCount} failed`,
      ),
    );
  }

  // Show next steps
  console.log(chalk.dim("\nNext steps:"));
  console.log(chalk.dim("  1. Review the generated configuration files"));
  console.log(chalk.dim("  2. Run: pnpm verify (or npm/yarn)"));
  console.log(chalk.dim("  3. Commit your changes\n"));
}

/**
 * Format audit report with colors for console display
 */
function formatAuditReportColored(report: AuditReport): string {
  const lines: string[] = [];

  lines.push(chalk.bold("📋 Audit Report\n"));

  // Project info
  lines.push(chalk.dim(`Framework: ${report.analysis.framework}`));
  lines.push(chalk.dim(`Package Manager: ${report.analysis.packageManager}`));
  lines.push(
    chalk.dim(`TypeScript: ${report.analysis.isTypeScript ? "Yes" : "No"}`),
  );
  lines.push(
    chalk.dim(`Monorepo: ${report.analysis.isMonorepo ? "Yes" : "No"}`),
  );
  lines.push("");

  // Plans
  for (const plan of report.plans) {
    const hasChanges = plan.changes.some((c) => c.type !== "unchanged");
    const icon = hasChanges ? "🔧" : "✓";
    const titleColor = hasChanges ? chalk.yellow : chalk.green;

    lines.push(
      titleColor(
        `${icon} ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} - ${plan.description}`,
      ),
    );

    for (const change of plan.changes) {
      let symbol: string;
      let line: string;

      switch (change.type) {
        case "add":
          symbol = chalk.green("+");
          line = chalk.green(change.description);
          break;
        case "modify":
          symbol = chalk.yellow("~");
          line = chalk.yellow(change.description);
          if (
            change.key &&
            change.oldValue !== undefined &&
            change.newValue !== undefined
          ) {
            line += chalk.dim(
              ` (${String(change.oldValue)} → ${String(change.newValue)})`,
            );
          }
          break;
        case "unchanged":
        default:
          symbol = chalk.dim("=");
          line = chalk.dim(change.description);
      }

      lines.push(`  ${symbol} ${line}`);
    }

    if (plan.devDependencies.length > 0) {
      lines.push(
        chalk.blue(`  📦 Install: ${plan.devDependencies.join(", ")}`),
      );
    }

    lines.push("");
  }

  // Summary
  if (report.allDevDependencies.length > 0) {
    lines.push(chalk.bold("Dependencies to install (batched):"));
    const pm = report.analysis.packageManager;
    const cmd =
      pm === "npm" ? "npm install" : pm === "yarn" ? "yarn add" : `${pm} add`;
    lines.push(
      chalk.cyan(`  ${cmd} -D ${report.allDevDependencies.join(" ")}`),
    );
    lines.push("");
  }

  lines.push(
    chalk.bold(
      `Total: ${report.totalChanges} changes, ${report.allDevDependencies.length} packages`,
    ),
  );

  return lines.join("\n");
}
