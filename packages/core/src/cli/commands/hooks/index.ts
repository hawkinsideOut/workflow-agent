/**
 * Hooks Command Group
 *
 * Consolidates git hooks management under `workflow hooks <subcommand>`:
 *   - install: Install git hooks for the project
 *   - uninstall: Remove installed git hooks
 *   - status: Show current hooks installation status
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

// Export individual actions for direct use
export { installAction as hooksInstallCommand };
export { uninstallAction as hooksUninstallCommand };
export { statusAction as hooksStatusCommand };

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

  return hooksCmd;
}
