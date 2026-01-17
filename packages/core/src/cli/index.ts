#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { createConfigCommand } from "./commands/config.js";
import { suggestCommand } from "./commands/suggest.js";
import { doctorCommand } from "./commands/doctor.js";
import { setupCommand } from "./commands/setup.js";
import { scopeCreateCommand } from "./commands/scope-create.js";
import { scopeMigrateCommand } from "./commands/scope-migrate.js";
import { hooksCommand } from "./commands/hooks.js";
import { githubCommand } from "./commands/github-actions.js";
import { fixCommand } from "./commands/fix.js";
import {
  visualCaptureCommand,
  visualCompareCommand,
  visualListCommand,
  visualUpdateCommand,
  visualApproveCommand,
} from "./commands/visual.js";

const program = new Command();

program
  .name("workflow")
  .description(
    "A self-evolving workflow management system for AI agent development",
  )
  .version("1.0.0");

program
  .command("init")
  .description("Initialize workflow in current project")
  .option("--migrate", "Auto-detect existing patterns and migrate")
  .option("--workspace", "Initialize for multiple repositories")
  .option(
    "--preset <preset>",
    "Preset to use (saas, library, api, ecommerce, cms, custom)",
  )
  .option("--name <name>", "Project name")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(initCommand);

program
  .command("validate <type>")
  .description("Validate branch name, commit message, or PR title")
  .argument("<type>", "What to validate: branch, commit, or pr")
  .argument(
    "[value]",
    "Value to validate (defaults to current branch/HEAD commit)",
  )
  .option(
    "--suggest-on-error",
    "Offer improvement suggestions on validation errors",
  )
  .action(validateCommand);

// Register the new config command with subcommands
program.addCommand(createConfigCommand());

program
  .command("suggest")
  .description("Submit an improvement suggestion")
  .argument("<feedback>", "Your improvement suggestion")
  .option("--author <author>", "Your name or username")
  .option(
    "--category <category>",
    "Category: feature, bug, documentation, performance, other",
  )
  .action(suggestCommand);

program
  .command("setup")
  .description("Add workflow scripts to package.json")
  .action(setupCommand);

program
  .command("doctor")
  .description("Run health check and get optimization suggestions")
  .option(
    "--check-guidelines-only",
    "Only check mandatory guidelines exist (exits 0 or 1)",
  )
  .action(doctorCommand);

program
  .command("hooks")
  .description("Manage git hooks (install, uninstall, status)")
  .argument("<action>", "Action: install, uninstall, status")
  .action(hooksCommand);

program
  .command("github")
  .description("Manage GitHub Actions CI (setup, check)")
  .argument("<action>", "Action: setup, check")
  .action(githubCommand);

program
  .command("scope:create")
  .description("Create a custom scope package")
  .option("--name <name>", 'Package name (e.g., "fintech", "gaming")')
  .option(
    "--scopes <scopes>",
    "Comma-separated scopes (format: name:description:emoji:category)",
  )
  .option("--preset-name <preset>", "Preset display name")
  .option("--output-dir <dir>", "Output directory")
  .option("--no-test", "Skip test file generation")
  .action(scopeCreateCommand);

program
  .command("scope:migrate")
  .description("Migrate inline scopes to a custom package")
  .option("--name <name>", "Package name for the preset")
  .option("--output-dir <dir>", "Output directory")
  .option("--keep-config", "Keep inline scopes in config after migration")
  .action(scopeMigrateCommand);

// Auto-heal fix command (invoked by GitHub App)
program
  .command("fix")
  .description("Auto-heal pipeline failures using LLM")
  .option("--error <error>", "Error message to fix (required)")
  .option("--context <context>", "Additional context JSON")
  .option("--files <files>", "Comma-separated file paths to analyze")
  .option("--auto", "Apply fix automatically without confirmation")
  .option("--dry-run", "Show what would be changed without applying")
  .action((options) => {
    fixCommand({
      error: options.error,
      context: options.context,
      files: options.files?.split(","),
      auto: options.auto,
      dryRun: options.dryRun,
    });
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
  .option("-o, --output <path>", "Output path")
  .option("--wait-for <selector>", "Wait for selector before capture")
  .option("--delay <ms>", "Additional delay in ms")
  .action(visualCaptureCommand);

visual
  .command("compare")
  .description("Compare a URL against a baseline")
  .argument("<url>", "URL to compare")
  .option("-b, --baseline <name>", "Baseline name to compare against (required)")
  .option("-o, --output <path>", "Output path for comparison screenshot")
  .option("-t, --threshold <percent>", "Difference threshold percentage")
  .action((url, options) => {
    if (!options.baseline) {
      console.error("Error: --baseline is required");
      process.exit(1);
    }
    visualCompareCommand(url, options);
  });

visual
  .command("list")
  .description("List all baselines")
  .option("--json", "Output as JSON")
  .action(visualListCommand);

visual
  .command("update")
  .description("Update an existing baseline")
  .argument("<name>", "Baseline name to update")
  .option("-w, --width <width>", "Override viewport width")
  .option("-h, --height <height>", "Override viewport height")
  .option("--full-page", "Capture full page")
  .action(visualUpdateCommand);

visual
  .command("approve")
  .description("Approve a comparison as the new baseline")
  .argument("<name>", "Baseline name to approve")
  .action(visualApproveCommand);

program.parse();
