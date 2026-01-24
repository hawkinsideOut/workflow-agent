#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { configCommand } from "./commands/config.js";
import { suggestCommand } from "./commands/suggest.js";
import { doctorCommand } from "./commands/doctor.js";
import { createSetupCommand } from "./commands/setup/index.js";
import { scopeCreateCommand } from "./commands/scope-create.js";
import { scopeMigrateCommand } from "./commands/scope-migrate.js";
import { verifyCommand } from "./commands/verify.js";
import { preCommitCommand } from "./commands/pre-commit.js";
import { autoSetupCommand } from "./commands/auto-setup-command.js";
// Command groups
import {
  createDocsCommand,
  docsValidateCommand,
  docsGenerateCommand,
  docsUpdateCommand,
} from "./commands/docs/index.js";
import { hooksCommand, createHooksCommand } from "./commands/hooks/index.js";
import {
  createSolutionCommand,
  solutionCaptureCommand,
  solutionSearchCommand,
  solutionListCommand,
  solutionApplyCommand,
  solutionDeprecateCommand,
  solutionStatsCommand,
} from "./commands/solution/index.js";
// Legacy imports for backward compatibility
import { advisoryCommand } from "./commands/advisory.js";

// Read version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8"),
);

/**
 * Show deprecation warning for old command syntax
 */
function deprecationWarning(oldCmd: string, newCmd: string): void {
  console.warn(
    chalk.yellow(`⚠️  "${oldCmd}" is deprecated and will be removed in v2.0.`),
  );
  console.warn(chalk.yellow(`   Use: ${newCmd}\n`));
}
import {
  createLearnCommand,
  learnRecordCommand,
  learnListCommand,
  learnApplyCommand,
  learnConfigCommand,
  learnDeprecateCommand,
  learnStatsCommand,
  learnPublishCommand,
  learnValidateCommand,
  learnCaptureCommand,
} from "./commands/learn/index.js";
import { syncCommand } from "./commands/sync.js";

const program = new Command();

program
  .name("workflow")
  .description(
    "A self-evolving workflow management system for AI agent development",
  )
  .version(packageJson.version);

// ============================================
// Command Groups (New Subcommand Pattern)
// ============================================

// Register docs command group
program.addCommand(createDocsCommand());

// Register solution command group
program.addCommand(createSolutionCommand());

// Register learn command group
program.addCommand(createLearnCommand());

// Register scope command group
import { createScopeCommand } from "./commands/scope/index.js";
program.addCommand(createScopeCommand());

// Register migrate command
import { migrateCommand } from "./commands/migrate.js";
program
  .command("migrate <subcommand>")
  .description("Migrate patterns and configurations")
  .option("--dry-run", "Preview without making changes")
  .option(
    "--type <type>",
    "Pattern type to migrate (fix, blueprint, solution, or all)",
    "all",
  )
  .addHelpText(
    "after",
    `
${chalk.bold("Subcommands:")}
  filenames                                           ${chalk.dim("# Migrate to slugified filenames")}

${chalk.bold("Examples:")}
  $ workflow migrate filenames --dry-run              ${chalk.dim("# Preview migration")}
  $ workflow migrate filenames                        ${chalk.dim("# Migrate all patterns")}
  $ workflow migrate filenames --type fix             ${chalk.dim("# Migrate only fixes")}
`,
  )
  .action(migrateCommand);

// Register hooks command group (top-level access)
program.addCommand(createHooksCommand());

// Register unified sync command
program
  .command("sync")
  .description("Sync patterns and solutions with the community registry")
  .option("--push", "Push local patterns to registry")
  .option("--pull", "Pull patterns from registry")
  .option("--solutions", "Include solution patterns")
  .option("--learn", "Include learning patterns (default)")
  .option("--scopes", "Sync custom scope packages")
  .option("--all", "Sync everything")
  .option("--dry-run", "Preview without syncing")
  .option("--enable-sync", "Enable pattern sync")
  .option("--disable-sync", "Disable pattern sync")
  .option("--include-private", "Include private patterns in push")
  .addHelpText(
    "after",
    `
${chalk.bold("Examples:")}
  ${chalk.dim("# Enable sync")}
  $ workflow sync --enable-sync

  ${chalk.dim("# Disable sync")}
  $ workflow sync --disable-sync

  ${chalk.dim("# Interactive sync (prompts for direction)")}
  $ workflow sync

  ${chalk.dim("# Push local patterns to registry")}
  $ workflow sync --push

  ${chalk.dim("# Pull patterns from registry")}
  $ workflow sync --pull

  ${chalk.dim("# Sync solutions only")}
  $ workflow sync --solutions --push

  ${chalk.dim("# Include private patterns in push")}
  $ workflow sync --solutions --push --include-private

  ${chalk.dim("# Preview what would be synced")}
  $ workflow sync --all --dry-run
`,
  )
  .action(syncCommand);

// ============================================
// Core Commands
// ============================================

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
  .command("validate <type> [value]")
  .description("Validate branch name, commit message, or PR title")
  .option(
    "--suggest-on-error",
    "Offer improvement suggestions on validation errors",
  )
  .action(validateCommand);

program
  .command("config <action> [key] [value]")
  .description("Manage workflow configuration")
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
        console.log(
          chalk.red(`✗ Failed to fix configuration: ${result.error}`),
        );
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

// Register setup command group (includes setup scripts, setup auto)
program.addCommand(createSetupCommand());

program
  .command("doctor")
  .description("Run health check and get optimization suggestions")
  .option("--check-guidelines-only", "Only check guidelines presence")
  .option("--fix", "Automatically fix validation issues in configuration")
  .action(doctorCommand);

// ============================================
// Deprecated Commands (Hidden, will be removed in v2.0)
// ============================================

// Legacy hooks command with action argument (replaced by top-level hooks subcommands)
program
  .command("hooks:install", { hidden: true })
  .description("[DEPRECATED] Use: workflow hooks install")
  .action(async () => {
    deprecationWarning("workflow hooks:install", "workflow hooks install");
    return hooksCommand("install");
  });

program
  .command("hooks:uninstall", { hidden: true })
  .description("[DEPRECATED] Use: workflow hooks uninstall")
  .action(async () => {
    deprecationWarning("workflow hooks:uninstall", "workflow hooks uninstall");
    return hooksCommand("uninstall");
  });

program
  .command("hooks:status", { hidden: true })
  .description("[DEPRECATED] Use: workflow hooks status")
  .action(async () => {
    deprecationWarning("workflow hooks:status", "workflow hooks status");
    return hooksCommand("status");
  });

program
  .command("scope:create", { hidden: true })
  .description("[DEPRECATED] Use: workflow scope create")
  .option("--name <name>", 'Package name (e.g., "fintech", "gaming")')
  .option(
    "--scopes <scopes>",
    "Comma-separated scopes (format: name:description:emoji:category)",
  )
  .option("--preset-name <preset>", "Preset display name")
  .option("--output-dir <dir>", "Output directory")
  .option("--no-test", "Skip test file generation")
  .action(async (options) => {
    deprecationWarning("workflow scope:create", "workflow scope create");
    return scopeCreateCommand(options);
  });

program
  .command("scope:migrate", { hidden: true })
  .description("[DEPRECATED] Use: workflow scope migrate")
  .option("--name <name>", "Package name for the preset")
  .option("--output-dir <dir>", "Output directory")
  .option("--keep-config", "Keep inline scopes in config after migration")
  .action(async (options) => {
    deprecationWarning("workflow scope:migrate", "workflow scope migrate");
    return scopeMigrateCommand(options);
  });

program
  .command("verify")
  .description("Run all quality checks with fix-and-revalidate pattern")
  .option("--fix", "Enable auto-fix for lint and format issues")
  .option("--max-retries <n>", "Maximum retry cycles (default: 10)", "10")
  .option("--commit", "Commit changes if all checks pass")
  .option("--dry-run", "Preview fixes without applying them")
  .option("--learn", "Record successful fixes as learning patterns")
  .option(
    "--no-platform-checks",
    "Skip platform-specific checks (Shopify, WordPress, etc.)",
  )
  .action(verifyCommand);

program
  .command("pre-commit")
  .description("Run pre-commit checks (alias for verify --fix --staged)")
  .option("--dry-run", "Preview fixes without applying them")
  .action(preCommitCommand);

// Deprecated: auto-setup → setup auto
program
  .command("auto-setup", { hidden: true })
  .description("[DEPRECATED] Use: workflow setup auto")
  .option("-y, --yes", "Auto-approve all prompts")
  .option("--audit", "Show audit report without applying changes")
  .action(async (options) => {
    deprecationWarning("workflow auto-setup", "workflow setup auto");
    return autoSetupCommand(options);
  });

// ============================================
// Deprecated Commands (Removed in v2.0)
// Use `workflow docs <subcommand>` instead
// ============================================

program
  .command("advisory", { hidden: true })
  .description("[DEPRECATED] Use: workflow docs advisory")
  .option("--depth <level>", "Analysis depth")
  .option("--output <path>", "Output directory")
  .option("--interactive", "Enable interactive mode")
  .option("--dry-run", "Preview analysis without writing files")
  .option("--format <type>", "Output format")
  .option("--timestamp", "Append timestamp to filenames")
  .option("--include-health", "Include code health metrics")
  .option("--ci", "CI mode with exit codes")
  .option("--compare <path>", "Compare with previous report")
  .action(async (options) => {
    deprecationWarning("workflow advisory", "workflow docs advisory");
    return advisoryCommand(options);
  });

program
  .command("generate-instructions", { hidden: true })
  .description("[DEPRECATED] Use: workflow docs generate")
  .option("--force", "Regenerate without confirmation")
  .action(async (options) => {
    deprecationWarning(
      "workflow generate-instructions",
      "workflow docs generate",
    );
    return docsGenerateCommand(options);
  });

program
  .command("update-templates", { hidden: true })
  .description("[DEPRECATED] Use: workflow docs update")
  .option("--force", "Overwrite existing template files")
  .option("--skip", "Skip the update")
  .action(async (options) => {
    deprecationWarning("workflow update-templates", "workflow docs update");
    return docsUpdateCommand(options);
  });

program
  .command("docs:validate", { hidden: true })
  .description("[DEPRECATED] Use: workflow docs validate")
  .option("--fix", "Interactively fix broken references")
  .option("--patterns <patterns>", "Glob patterns to scan")
  .option("--ignore <patterns>", "Glob patterns to ignore")
  .action(async (options) => {
    deprecationWarning("workflow docs:validate", "workflow docs validate");
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
// Deprecated Learning Commands (Removed in v2.0)
// Use `workflow learn <subcommand>` instead
// ============================================

program
  .command("learn:record", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn record")
  .option("--name <name>", "Pattern name")
  .option("--description <desc>", "Pattern description")
  .option("--category <cat>", "Category")
  .option("--framework <fw>", "Framework")
  .option("--version <ver>", "Framework version range")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--type <type>", "Pattern type")
  .action(async (options) => {
    deprecationWarning("workflow learn:record", "workflow learn record");
    return learnRecordCommand(options);
  });

program
  .command("learn:list", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn list")
  .option("--type <type>", "Filter by type")
  .option("--framework <fw>", "Filter by framework")
  .option("--tag <tag>", "Filter by tag")
  .option("--deprecated", "Include deprecated patterns")
  .action(async (options) => {
    deprecationWarning("workflow learn:list", "workflow learn list");
    return learnListCommand(options);
  });

program
  .command("learn:apply <patternId>", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn apply")
  .option("--framework <fw>", "Override framework")
  .option("--version <ver>", "Override version")
  .option("--dry-run", "Preview without applying")
  .action(async (patternId, options) => {
    deprecationWarning("workflow learn:apply", "workflow learn apply");
    return learnApplyCommand(patternId, options);
  });

program
  .command("learn:capture <paths...>", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn capture")
  .option("--name <name>", "Pattern name")
  .option("--description <desc>", "Pattern description")
  .option("--framework <fw>", "Override inferred framework")
  .option("--tags <tags>", "Additional tags")
  .option("--dry-run", "Preview capture")
  .action(async (paths, options) => {
    deprecationWarning("workflow learn:capture", "workflow learn capture");
    return learnCaptureCommand(paths, options);
  });

program
  .command("learn:sync", { hidden: true })
  .description("[DEPRECATED] Use: workflow sync")
  .option("--push", "Push local patterns")
  .option("--pull", "Pull patterns")
  .option("--dry-run", "Preview without syncing")
  .action(async (options) => {
    deprecationWarning("workflow learn:sync", "workflow sync");
    return syncCommand({ ...options, learn: true });
  });

program
  .command("learn:config", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn config")
  .option("--enable-sync", "Enable pattern sync")
  .option("--disable-sync", "Disable pattern sync")
  .option("--enable-telemetry", "Enable telemetry")
  .option("--disable-telemetry", "Disable telemetry")
  .option("--reset-id", "Reset contributor ID")
  .option("--show", "Show current configuration")
  .action(async (options) => {
    deprecationWarning("workflow learn:config", "workflow learn config");
    return learnConfigCommand(options);
  });

program
  .command("learn:deprecate <patternId> <reason>", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn deprecate")
  .action(async (patternId, reason) => {
    deprecationWarning("workflow learn:deprecate", "workflow learn deprecate");
    return learnDeprecateCommand(patternId, reason);
  });

program
  .command("learn:publish [patternId]", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn publish")
  .option("--private", "Mark as private")
  .option("--all", "Apply to all patterns")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (patternId, options) => {
    deprecationWarning("workflow learn:publish", "workflow learn publish");
    return learnPublishCommand(patternId, options);
  });

program
  .command("learn:stats", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn stats")
  .action(async () => {
    deprecationWarning("workflow learn:stats", "workflow learn stats");
    return learnStatsCommand();
  });

program
  .command("learn:validate", { hidden: true })
  .description("[DEPRECATED] Use: workflow learn validate")
  .option("-t, --type <type>", "Pattern type to validate", "all")
  .option("-f, --file <path>", "Validate a specific file")
  .option("--fix", "Automatically fix common issues")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options) => {
    deprecationWarning("workflow learn:validate", "workflow learn validate");
    return learnValidateCommand(options);
  });

// ============================================
// Deprecated Solution Commands (Removed in v2.0)
// Use `workflow solution <subcommand>` instead
// ============================================

program
  .command("solution:capture", { hidden: true })
  .description("[DEPRECATED] Use: workflow solution capture")
  .option("--name <name>", "Solution name")
  .option("--description <desc>", "Solution description")
  .option("--category <cat>", "Category")
  .option("--keywords <kw>", "Comma-separated keywords")
  .option("--path <path>", "Path to the solution directory")
  .option("--anonymize", "Anonymize sensitive data")
  .option("--private", "Keep solution private")
  .action(async (options) => {
    deprecationWarning(
      "workflow solution:capture",
      "workflow solution capture",
    );
    return solutionCaptureCommand(options);
  });

program
  .command("solution:search <query>", { hidden: true })
  .description("[DEPRECATED] Use: workflow solution search")
  .option("--category <cat>", "Filter by category")
  .option("--framework <fw>", "Filter by framework")
  .option("--limit <n>", "Maximum results", "10")
  .action(async (query, options) => {
    deprecationWarning("workflow solution:search", "workflow solution search");
    return solutionSearchCommand(query, options);
  });

program
  .command("solution:list", { hidden: true })
  .description("[DEPRECATED] Use: workflow solution list")
  .option("--category <cat>", "Filter by category")
  .option("--framework <fw>", "Filter by framework")
  .option("--deprecated", "Include deprecated solutions")
  .option("--limit <n>", "Maximum results", "20")
  .action(async (options) => {
    deprecationWarning("workflow solution:list", "workflow solution list");
    return solutionListCommand(options);
  });

program
  .command("solution:apply <solutionId>", { hidden: true })
  .description("[DEPRECATED] Use: workflow solution apply")
  .option("--output <dir>", "Output directory")
  .option("--dry-run", "Preview without applying")
  .option("--include-tests", "Include test files")
  .action(async (solutionId, options) => {
    deprecationWarning("workflow solution:apply", "workflow solution apply");
    return solutionApplyCommand(solutionId, options);
  });

program
  .command("solution:deprecate <solutionId> <reason>", { hidden: true })
  .description("[DEPRECATED] Use: workflow solution deprecate")
  .action(async (solutionId, reason) => {
    deprecationWarning(
      "workflow solution:deprecate",
      "workflow solution deprecate",
    );
    return solutionDeprecateCommand(solutionId, reason);
  });

program
  .command("solution:stats", { hidden: true })
  .description("[DEPRECATED] Use: workflow solution stats")
  .action(async () => {
    deprecationWarning("workflow solution:stats", "workflow solution stats");
    return solutionStatsCommand();
  });

program.parse();
