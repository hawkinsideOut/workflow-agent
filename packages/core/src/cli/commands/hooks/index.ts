/**
 * Hooks Command Group
 *
 * Consolidates git hooks management under `workflow hooks <subcommand>`:
 *   - install: Install git hooks for the project
 *   - uninstall: Remove installed git hooks
 *   - status: Show current hooks installation status
 *   - test: Test that hooks are properly installed
 */

import { Command } from "commander";
import chalk from "chalk";
import { hooksCommand } from "../hooks.js";

// Re-export for backward compatibility
export { hooksCommand };

/**
 * Create individual action wrappers
 */
async function installAction(): Promise<void> {
  return hooksCommand("install");
}

async function uninstallAction(): Promise<void> {
  return hooksCommand("uninstall");
}

async function statusAction(): Promise<void> {
  return hooksCommand("status");
}

/**
 * Hooks test command - validates hook installation with optional dry-run
 */
async function testAction(options: { dryRun?: boolean }): Promise<void> {
  console.log(chalk.bold.cyan("\n🧪 Testing Git Hooks\n"));

  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();
  const gitDir = path.join(cwd, ".git");
  const hooksDir = path.join(gitDir, "hooks");

  // Check git repo exists
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.red("✗ Not a git repository"));
    process.exit(1);
  }

  // Check hooks directory
  if (!fs.existsSync(hooksDir)) {
    console.log(chalk.yellow("  No hooks directory found"));
    console.log(chalk.dim("  Run: workflow hooks install"));
    process.exit(1);
  }

  const hookTypes = ["pre-commit", "commit-msg"];
  let allInstalled = true;

  for (const hookType of hookTypes) {
    const hookPath = path.join(hooksDir, hookType);
    const exists = fs.existsSync(hookPath);
    const isExecutable = exists && (fs.statSync(hookPath).mode & 0o111) !== 0;
    // Check for "workflow" in hook content (covers "Workflow Agent" and "workflow hooks")
    const isWorkflowHook = exists && fs.readFileSync(hookPath, "utf-8").toLowerCase().includes("workflow");

    if (exists && isExecutable && isWorkflowHook) {
      console.log(chalk.green(`  ✓ ${hookType} - installed and executable`));
    } else if (exists && !isWorkflowHook) {
      console.log(chalk.yellow(`  ⚠ ${hookType} - exists but not managed by workflow-agent`));
      allInstalled = false;
    } else if (exists && !isExecutable) {
      console.log(chalk.red(`  ✗ ${hookType} - exists but not executable`));
      allInstalled = false;
    } else {
      console.log(chalk.red(`  ✗ ${hookType} - not installed`));
      allInstalled = false;
    }
  }

  // Optional dry-run: simulate hook execution
  if (options.dryRun) {
    console.log(chalk.bold.cyan("\n  Dry-run hook simulation:\n"));

    // Simulate pre-commit
    console.log(chalk.dim("  Simulating pre-commit hook..."));
    const { verifyCommand } = await import("../verify.js");
    try {
      await verifyCommand({ fix: false, dryRun: true, maxRetries: "1" });
    } catch {
      // Expected to potentially fail, that's ok for dry-run
    }
  }

  if (!allInstalled) {
    console.log(chalk.yellow("\n  Some hooks are not properly installed"));
    console.log(chalk.dim("  Run: workflow hooks install"));
    process.exit(1);
  }

  console.log(chalk.green("\n✓ All hooks are properly installed"));
}

// Export individual actions for direct use
export { installAction as hooksInstallCommand };
export { uninstallAction as hooksUninstallCommand };
export { statusAction as hooksStatusCommand };
export { testAction as hooksTestCommand };

/**
 * Create the hooks command group with all subcommands
 */
export function createHooksCommand(): Command {
  const hooksCmd = new Command("hooks")
    .description("Manage git hooks for the project")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow hooks install                ${chalk.dim("# Install git hooks")}
  $ workflow hooks uninstall              ${chalk.dim("# Remove git hooks")}
  $ workflow hooks status                 ${chalk.dim("# Check hooks status")}
  $ workflow hooks test                   ${chalk.dim("# Verify installation")}
  $ workflow hooks test --dry-run         ${chalk.dim("# Test with simulation")}
`,
    )
    .action(() => {
      // Show help if no subcommand provided
      hooksCmd.help();
    });

  // install subcommand
  hooksCmd
    .command("install")
    .description("Install git hooks for the project")
    .addHelpText(
      "after",
      `
${chalk.bold("Details:")}
  Installs pre-commit and commit-msg hooks that:
  - Validate branch names
  - Validate commit message format
  - Run quality checks before commit

  If existing hooks are found, they will be wrapped
  so both the original and workflow hooks run.
`,
    )
    .action(installAction);

  // uninstall subcommand
  hooksCmd
    .command("uninstall")
    .description("Remove installed git hooks")
    .addHelpText(
      "after",
      `
${chalk.bold("Details:")}
  Removes workflow agent hooks from the project.
  If original hooks were wrapped, they will be restored.
`,
    )
    .action(uninstallAction);

  // status subcommand
  hooksCmd
    .command("status")
    .description("Show current hooks installation status")
    .addHelpText(
      "after",
      `
${chalk.bold("Details:")}
  Shows which git hooks are installed and whether
  they are managed by workflow agent.
`,
    )
    .action(statusAction);

  // test subcommand
  hooksCmd
    .command("test")
    .description("Test that hooks are properly installed")
    .option("--dry-run", "Simulate hook execution without making changes")
    .addHelpText(
      "after",
      `
${chalk.bold("Details:")}
  Verifies that git hooks are properly installed and executable.
  Use --dry-run to simulate hook execution.
`,
    )
    .action(testAction);

  return hooksCmd;
}
