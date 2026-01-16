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

program.parse();
