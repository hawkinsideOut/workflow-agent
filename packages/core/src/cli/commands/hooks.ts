/**
 * CLI command for managing git hooks
 * Provides install, uninstall, and status subcommands
 */

import chalk from "chalk";
import { loadConfig } from "../../config/index.js";
import {
  installHooks,
  uninstallHooks,
  getAllHooksStatus,
  hasGitRepo,
} from "../../utils/hooks.js";

export async function hooksCommand(action: string) {
  const cwd = process.cwd();

  switch (action) {
    case "install":
      await installHooksAction(cwd);
      break;
    case "uninstall":
      await uninstallHooksAction(cwd);
      break;
    case "status":
      await statusHooksAction(cwd);
      break;
    default:
      console.error(chalk.red(`Unknown action: ${action}`));
      console.log(chalk.dim("Available actions: install, uninstall, status"));
      process.exit(1);
  }
}

async function installHooksAction(cwd: string) {
  console.log(chalk.bold.cyan("\n🔗 Installing Workflow Agent Git Hooks\n"));

  // Check for git repo
  if (!hasGitRepo(cwd)) {
    console.error(chalk.red("✗ No git repository found"));
    console.log(chalk.yellow("  Run: git init"));
    process.exit(1);
  }

  // Load config for hook settings
  const config = await loadConfig();
  const hooksConfig = config?.hooks;

  // Install hooks
  const results = await installHooks(hooksConfig, cwd);

  let hasErrors = false;
  for (const result of results) {
    if (result.success) {
      if (result.wrappedExisting) {
        console.log(
          chalk.green(
            `✓ Installed ${result.hookType} hook (wrapped existing hook)`,
          ),
        );
      } else {
        console.log(chalk.green(`✓ Installed ${result.hookType} hook`));
      }
    } else {
      console.error(
        chalk.red(`✗ Failed to install ${result.hookType}: ${result.error}`),
      );
      hasErrors = true;
    }
  }

  if (!hasErrors) {
    console.log(chalk.green("\n✓ Git hooks installed successfully"));
    console.log(chalk.dim("\nHooks will run automatically on commit."));
    console.log(chalk.dim("They will be skipped in CI environments."));
  } else {
    process.exit(1);
  }
}

async function uninstallHooksAction(cwd: string) {
  console.log(chalk.bold.cyan("\n🔓 Uninstalling Workflow Agent Git Hooks\n"));

  // Check for git repo
  if (!hasGitRepo(cwd)) {
    console.error(chalk.red("✗ No git repository found"));
    process.exit(1);
  }

  // Uninstall hooks
  const results = await uninstallHooks(cwd);

  let hasErrors = false;
  for (const result of results) {
    if (result.success) {
      if (result.wrappedExisting) {
        console.log(
          chalk.green(`✓ Removed ${result.hookType} hook (restored original)`),
        );
      } else {
        console.log(chalk.green(`✓ Removed ${result.hookType} hook`));
      }
    } else if (result.error) {
      console.error(
        chalk.red(`✗ Failed to remove ${result.hookType}: ${result.error}`),
      );
      hasErrors = true;
    }
  }

  if (!hasErrors) {
    console.log(chalk.green("\n✓ Git hooks uninstalled successfully"));
  } else {
    process.exit(1);
  }
}

async function statusHooksAction(cwd: string) {
  console.log(chalk.bold.cyan("\n📊 Workflow Agent Git Hooks Status\n"));

  // Check for git repo
  if (!hasGitRepo(cwd)) {
    console.error(chalk.red("✗ No git repository found"));
    process.exit(1);
  }

  // Get hook status
  const statuses = await getAllHooksStatus(cwd);

  for (const status of statuses) {
    const icon = status.installed ? "✓" : "✗";
    const color = status.installed ? chalk.green : chalk.yellow;

    let message = `${icon} ${status.hookType}`;

    if (status.installed) {
      message += " - installed";
      if (status.wrappedOriginal) {
        message += " (wrapping original hook)";
      }
    } else if (status.hasExistingHook) {
      message += " - existing hook (not managed by Workflow Agent)";
    } else {
      message += " - not installed";
    }

    console.log(color(message));
  }

  const allInstalled = statuses.every((s) => s.installed);
  if (!allInstalled) {
    console.log(chalk.dim("\nTo install hooks: workflow hooks install"));
  }
}
