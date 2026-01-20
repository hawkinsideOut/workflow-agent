#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { configCommand } from "./commands/config.js";
import { suggestCommand } from "./commands/suggest.js";
import { doctorCommand } from "./commands/doctor.js";
import { setupCommand } from "./commands/setup.js";
import { scopeCreateCommand } from "./commands/scope-create.js";
import { scopeMigrateCommand } from "./commands/scope-migrate.js";
import { verifyCommand } from "./commands/verify.js";
import { autoSetupCommand } from "./commands/auto-setup-command.js";
import { advisoryCommand } from "./commands/advisory.js";
import { generateInstructionsCommand } from "./commands/generate-instructions.js";
import { updateTemplatesCommand } from "./commands/update-templates.js";
import { docsValidateCommand } from "./commands/docs-validate.js";
import { hooksCommand } from "./commands/hooks.js";
import {
  learnRecordCommand,
  learnListCommand,
  learnApplyCommand,
  learnSyncCommand,
  learnConfigCommand,
  learnDeprecateCommand,
  learnStatsCommand,
  learnPublishCommand,
} from "./commands/learn.js";
import {
  solutionCaptureCommand,
  solutionSearchCommand,
  solutionListCommand,
  solutionApplyCommand,
  solutionDeprecateCommand,
  solutionStatsCommand,
} from "./commands/solution.js";

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

program
  .command("config <action>")
  .description("Manage workflow configuration")
  .argument("<action>", "Action: get, set, add, remove")
  .argument("[key]", "Config key")
  .argument("[value]", "Config value")
  .action(configCommand);

program
  .command("config:fix")
  .description("Automatically fix common configuration validation issues")
  .action(async () => {
    const chalk = (await import("chalk")).default;
    const { autoFixConfigFile } = await import("../config/index.js");

    console.log(chalk.bold.cyan("\n🔧 Workflow Configuration Auto-Fix\n"));

    const result = await autoFixConfigFile();

    if (result.success) {
      if (result.changes.length === 0) {
        console.log(chalk.green("✓ Configuration is already valid!"));
      } else {
        console.log(chalk.green("✓ Configuration fixed successfully!\n"));
        console.log(chalk.dim("Changes made:"));
        for (const change of result.changes) {
          console.log(chalk.dim(`  • ${change}`));
        }
        console.log();
      }
      process.exit(0);
    } else {
      if (result.configPath) {
        console.log(chalk.red(`✗ Failed to fix configuration: ${result.error}`));
      } else {
        console.log(chalk.red("✗ No workflow configuration file found"));
        console.log(chalk.yellow("  Run: workflow init"));
      }
      process.exit(1);
    }
  });

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
  .option("--check-guidelines-only", "Only check guidelines presence")
  .option("--fix", "Automatically fix validation issues in configuration")
  .action(doctorCommand);

program
  .command("hooks <action>")
  .description("Manage git hooks")
  .action(hooksCommand);

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

program
  .command("verify")
  .description("Run all quality checks with fix-and-revalidate pattern")
  .option("--fix", "Enable auto-fix for lint and format issues")
  .option("--max-retries <n>", "Maximum retry cycles (default: 10)", "10")
  .option("--commit", "Commit changes if all checks pass")
  .option("--dry-run", "Preview fixes without applying them")
  .option("--learn", "Record successful fixes as learning patterns")
  .action(verifyCommand);

program
  .command("auto-setup")
  .description("Automatically configure linting, formatting, testing, and CI")
  .option("-y, --yes", "Auto-approve all prompts")
  .option("--audit", "Show audit report without applying changes")
  .action(autoSetupCommand);

program
  .command("advisory")
  .description("Generate advisory board analysis and documentation")
  .option(
    "--depth <level>",
    "Analysis depth: executive, quick, standard, comprehensive",
  )
  .option("--output <path>", "Output directory (default: docs/advisory)")
  .option("--interactive", "Enable interactive mode")
  .option("--dry-run", "Preview analysis without writing files")
  .option(
    "--format <type>",
    "Output format: markdown, json (default: markdown)",
  )
  .option("--timestamp", "Append timestamp to filenames")
  .option("--include-health", "Include code health metrics from verify/doctor")
  .option("--ci", "CI mode with exit codes on high-risk findings")
  .option("--compare <path>", "Compare with previous report")
  .action(advisoryCommand);

program
  .command("generate-instructions")
  .description("Generate .github/copilot-instructions.md from guidelines")
  .option("--force", "Regenerate without confirmation")
  .action(generateInstructionsCommand);

program
  .command("update-templates")
  .description("Update guideline templates from the latest package version")
  .option("--force", "Overwrite existing template files")
  .option("--skip", "Skip the update (useful in CI)")
  .action(updateTemplatesCommand);

program
  .command("docs:validate")
  .description("Validate document references in markdown files")
  .option("--fix", "Interactively fix broken references")
  .option("--patterns <patterns>", "Glob patterns to scan (comma-separated, default: **/*.md)")
  .option("--ignore <patterns>", "Glob patterns to ignore (comma-separated)")
  .action((options) => {
    const patterns = options.patterns
      ? options.patterns.split(",").map((p: string) => p.trim())
      : undefined;
    const ignore = options.ignore
      ? options.ignore.split(",").map((p: string) => p.trim())
      : undefined;

    return docsValidateCommand({
      fix: options.fix,
      patterns,
      ignore,
    });
  });

// ============================================
// Learning System Commands
// ============================================

program
  .command("learn:record")
  .description("Record a new pattern from a successful implementation")
  .option("--name <name>", "Pattern name")
  .option("--description <desc>", "Pattern description")
  .option(
    "--category <cat>",
    "Category (migration, security, performance, etc.)",
  )
  .option("--framework <fw>", "Framework (next, react, vue, etc.)")
  .option("--version <ver>", "Framework version range")
  .option("--tags <tags>", "Comma-separated tags (category:value)")
  .option("--type <type>", "Pattern type (fix, blueprint)")
  .action(learnRecordCommand);

program
  .command("learn:list")
  .description("List recorded learning patterns")
  .option("--type <type>", "Filter by type (fix, blueprint, all)")
  .option("--framework <fw>", "Filter by framework")
  .option("--tag <tag>", "Filter by tag")
  .option("--deprecated", "Include deprecated patterns")
  .action(learnListCommand);

program
  .command("learn:apply <patternId>")
  .description("Apply a pattern to the current project")
  .argument("<patternId>", "Pattern ID to apply")
  .option("--framework <fw>", "Override framework")
  .option("--version <ver>", "Override version")
  .option("--dry-run", "Preview without applying")
  .action(learnApplyCommand);

program
  .command("learn:sync")
  .description("Sync patterns with remote registry")
  .option("--push", "Push local patterns to registry")
  .option("--pull", "Pull patterns from registry")
  .option("--dry-run", "Preview without syncing")
  .action(learnSyncCommand);

program
  .command("learn:config")
  .description("Configure learning settings")
  .option("--enable-sync", "Enable pattern sync")
  .option("--disable-sync", "Disable pattern sync")
  .option("--enable-telemetry", "Enable anonymous telemetry")
  .option("--disable-telemetry", "Disable telemetry")
  .option("--reset-id", "Reset contributor ID")
  .option("--show", "Show current configuration")
  .action(learnConfigCommand);

program
  .command("learn:deprecate <patternId> <reason>")
  .description("Deprecate an outdated pattern")
  .argument("<patternId>", "Pattern ID to deprecate")
  .argument("<reason>", "Reason for deprecation")
  .action(learnDeprecateCommand);

program
  .command("learn:publish [patternId]")
  .description("Mark pattern(s) as public for syncing")
  .option("--private", "Mark as private instead of public")
  .option("--all", "Apply to all patterns")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(learnPublishCommand);

program
  .command("learn:stats")
  .description("Show learning statistics")
  .action(learnStatsCommand);

// ============================================
// Solution Pattern Commands
// ============================================

program
  .command("solution:capture")
  .description("Capture a solution pattern from working code")
  .option("--name <name>", "Solution name")
  .option("--description <desc>", "Solution description")
  .option(
    "--category <cat>",
    "Category (auth, api, database, ui, testing, deployment, integration, performance, security, other)",
  )
  .option("--keywords <kw>", "Comma-separated keywords")
  .option("--path <path>", "Path to the solution directory")
  .option("--anonymize", "Anonymize sensitive data in code")
  .action(solutionCaptureCommand);

program
  .command("solution:search <query>")
  .description("Search for solution patterns")
  .argument("<query>", "Search query (keywords, problem description)")
  .option("--category <cat>", "Filter by category")
  .option("--framework <fw>", "Filter by framework")
  .option("--limit <n>", "Maximum results", "10")
  .action(solutionSearchCommand);

program
  .command("solution:list")
  .description("List all solution patterns")
  .option("--category <cat>", "Filter by category")
  .option("--framework <fw>", "Filter by framework")
  .option("--deprecated", "Include deprecated solutions")
  .option("--limit <n>", "Maximum results", "20")
  .action(solutionListCommand);

program
  .command("solution:apply <solutionId>")
  .description("Apply a solution pattern to the current project")
  .argument("<solutionId>", "Solution ID to apply")
  .option("--output <dir>", "Output directory")
  .option("--dry-run", "Preview without applying")
  .option("--include-tests", "Include test files")
  .action(solutionApplyCommand);

program
  .command("solution:deprecate <solutionId> <reason>")
  .description("Deprecate a solution pattern")
  .argument("<solutionId>", "Solution ID to deprecate")
  .argument("<reason>", "Reason for deprecation")
  .action(solutionDeprecateCommand);

program
  .command("solution:stats")
  .description("Show solution pattern statistics")
  .action(solutionStatsCommand);

program.parse();
