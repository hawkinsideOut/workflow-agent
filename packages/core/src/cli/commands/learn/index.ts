/**
 * Learn Command Group
 *
 * Consolidates learning pattern commands under `workflow learn <subcommand>`:
 *   - record: Record a new pattern from a successful implementation
 *   - list: List recorded learning patterns
 *   - apply: Apply a pattern to the current project
 *   - capture: Capture files as a blueprint pattern
 *   - analyze: Analyze codebase for learning opportunities
 *   - export: Export patterns to a file
 *   - import: Import patterns from a file
 *   - sync: Sync patterns with remote registry
 *   - config: Configure learning settings
 *   - deprecate: Deprecate an outdated pattern
 *   - publish: Mark pattern(s) as public for syncing
 *   - stats: Show learning statistics
 *   - clean: Clean old or stale patterns
 *   - validate: Validate pattern files
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  learnRecordCommand,
  learnListCommand,
  learnApplyCommand,
  learnCaptureCommand,
  learnConfigCommand,
  learnDeprecateCommand,
  learnPublishCommand,
  learnStatsCommand,
  learnValidateCommand,
  learnAnalyzeCommand,
  learnExportCommand,
  learnImportCommand,
  learnCleanCommand,
} from "../learn.js";

/**
 * Create the learn command group with all subcommands
 */
export function createLearnCommand(): Command {
  const learnCmd = new Command("learn")
    .description("Manage learning patterns for AI-assisted development")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn record                           ${chalk.dim("# Interactive pattern recording")}
  $ workflow learn list --type blueprint            ${chalk.dim("# List blueprints only")}
  $ workflow learn apply abc123 --dry-run           ${chalk.dim("# Preview pattern application")}
  $ workflow learn capture ./src/auth --name auth   ${chalk.dim("# Capture as blueprint")}
  $ workflow learn analyze                          ${chalk.dim("# Find learning opportunities")}
  $ workflow learn export --format json             ${chalk.dim("# Export patterns")}
  $ workflow learn import patterns.json             ${chalk.dim("# Import patterns")}
  $ workflow learn sync --push                      ${chalk.dim("# Push patterns to registry")}
  $ workflow learn config --show                    ${chalk.dim("# Show current configuration")}
  $ workflow learn stats                            ${chalk.dim("# Show learning statistics")}
  $ workflow learn clean --deprecated               ${chalk.dim("# Clean deprecated patterns")}
  $ workflow learn validate --fix                   ${chalk.dim("# Auto-fix pattern issues")}
`,
    )
    .action(() => {
      // Show help if no subcommand provided
      learnCmd.help();
    });

  // record subcommand
  learnCmd
    .command("record")
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
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn record                              ${chalk.dim("# Interactive mode")}
  $ workflow learn record --name "Auth Fix" \\
    --category security --type fix                     ${chalk.dim("# With metadata")}
  $ workflow learn record --framework next \\
    --version ">=14.0.0"                               ${chalk.dim("# With framework")}
`,
    )
    .action(learnRecordCommand);

  // list subcommand
  learnCmd
    .command("list")
    .description("List recorded learning patterns")
    .option("--type <type>", "Filter by type (fix, blueprint, all)")
    .option("--framework <fw>", "Filter by framework")
    .option("--tag <tag>", "Filter by tag")
    .option("--deprecated", "Include deprecated patterns")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn list                                ${chalk.dim("# List all patterns")}
  $ workflow learn list --type blueprint               ${chalk.dim("# Only blueprints")}
  $ workflow learn list --framework next               ${chalk.dim("# Filter by framework")}
  $ workflow learn list --deprecated                   ${chalk.dim("# Include deprecated")}
`,
    )
    .action(learnListCommand);

  // apply subcommand
  learnCmd
    .command("apply <patternId>")
    .description("Apply a pattern to the current project")
    .option("--framework <fw>", "Override framework")
    .option("--version <ver>", "Override version")
    .option("--dry-run", "Preview without applying")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn apply abc123                        ${chalk.dim("# Apply pattern")}
  $ workflow learn apply abc123 --dry-run              ${chalk.dim("# Preview changes")}
  $ workflow learn apply abc123 --framework react      ${chalk.dim("# Override framework")}
`,
    )
    .action(learnApplyCommand);

  // capture subcommand
  learnCmd
    .command("capture <paths...>")
    .description(
      "Capture files as a blueprint pattern with auto-inferred metadata",
    )
    .option("--name <name>", "Pattern name (inferred from paths if omitted)")
    .option("--description <desc>", "Pattern description")
    .option("--framework <fw>", "Override inferred framework")
    .option("--tags <tags>", "Additional tags (comma-separated)")
    .option("--dry-run", "Preview what would be captured without saving")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn capture ./src/auth                  ${chalk.dim("# Capture auth module")}
  $ workflow learn capture ./src/auth --name "Auth"    ${chalk.dim("# With custom name")}
  $ workflow learn capture ./components --dry-run      ${chalk.dim("# Preview capture")}
  $ workflow learn capture ./hooks --tags "react,hooks" ${chalk.dim("# With tags")}
`,
    )
    .action(learnCaptureCommand);

  // sync subcommand
  learnCmd
    .command("sync")
    .description(
      "Sync patterns with remote registry (alias for: workflow sync --learn)",
    )
    .option("--push", "Push local patterns to registry")
    .option("--pull", "Pull patterns from registry")
    .option("--dry-run", "Preview without syncing")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn sync                                ${chalk.dim("# Interactive sync")}
  $ workflow learn sync --push                         ${chalk.dim("# Push to registry")}
  $ workflow learn sync --pull                         ${chalk.dim("# Pull from registry")}
  $ workflow learn sync --push --dry-run               ${chalk.dim("# Preview push")}

${chalk.bold("Pro Tip:")}
  For more options including solutions sync, use:
  $ workflow sync --all                                ${chalk.dim("# Sync everything")}
`,
    )
    .action(async (options) => {
      // Forward to unified sync with learn flag
      const { syncCommand } = await import("../sync.js");
      return syncCommand({ ...options, learn: true });
    });

  // config subcommand
  learnCmd
    .command("config")
    .description("Configure learning settings")
    .option("--enable-sync", "Enable pattern sync")
    .option("--disable-sync", "Disable pattern sync")
    .option("--enable-telemetry", "Enable anonymous telemetry")
    .option("--disable-telemetry", "Disable telemetry")
    .option("--reset-id", "Reset contributor ID")
    .option("--show", "Show current configuration")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn config --show                       ${chalk.dim("# Show current config")}
  $ workflow learn config --enable-sync                ${chalk.dim("# Enable sync")}
  $ workflow learn config --disable-telemetry          ${chalk.dim("# Disable telemetry")}
  $ workflow learn config --reset-id                   ${chalk.dim("# Reset contributor ID")}
`,
    )
    .action(learnConfigCommand);

  // deprecate subcommand
  learnCmd
    .command("deprecate <patternId> <reason>")
    .description("Deprecate an outdated pattern")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn deprecate abc123 "Superseded by xyz789"
  $ workflow learn deprecate def456 "No longer compatible with latest version"
`,
    )
    .action(learnDeprecateCommand);

  // publish subcommand
  learnCmd
    .command("publish [patternId]")
    .description("Mark pattern(s) as public for syncing")
    .option("--private", "Mark as private instead of public")
    .option("--all", "Apply to all patterns")
    .option("-y, --yes", "Skip confirmation prompts")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn publish abc123                      ${chalk.dim("# Publish one pattern")}
  $ workflow learn publish --all                       ${chalk.dim("# Publish all patterns")}
  $ workflow learn publish abc123 --private            ${chalk.dim("# Make private")}
  $ workflow learn publish --all -y                    ${chalk.dim("# Publish all, skip prompt")}
`,
    )
    .action(learnPublishCommand);

  // stats subcommand
  learnCmd
    .command("stats")
    .description("Show learning statistics")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn stats                               ${chalk.dim("# Show all statistics")}
`,
    )
    .action(learnStatsCommand);

  // analyze subcommand
  learnCmd
    .command("analyze")
    .description("Analyze codebase for learning opportunities")
    .option("-v, --verbose", "Show detailed output including paths")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn analyze                             ${chalk.dim("# Find learning opportunities")}
  $ workflow learn analyze --verbose                   ${chalk.dim("# Show paths and details")}
`,
    )
    .action(learnAnalyzeCommand);

  // export subcommand
  learnCmd
    .command("export")
    .description("Export learning patterns to a file")
    .option("-o, --output <path>", "Output file path", "patterns-export.json")
    .option("-f, --format <format>", "Output format (json, yaml)", "json")
    .option(
      "-t, --type <type>",
      "Pattern type to export (fix, blueprint, all)",
      "all",
    )
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn export                              ${chalk.dim("# Export all as JSON")}
  $ workflow learn export --format yaml                ${chalk.dim("# Export as YAML")}
  $ workflow learn export --type fix                   ${chalk.dim("# Export only fixes")}
  $ workflow learn export -o backup.json               ${chalk.dim("# Custom output path")}
`,
    )
    .action(learnExportCommand);

  // import subcommand
  learnCmd
    .command("import <file>")
    .description("Import learning patterns from a file")
    .option("-f, --format <format>", "Input format (json, yaml)", "json")
    .option("--dry-run", "Preview import without making changes")
    .option("--no-merge", "Skip existing patterns instead of merging")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn import patterns.json                ${chalk.dim("# Import from JSON")}
  $ workflow learn import backup.json --dry-run        ${chalk.dim("# Preview import")}
  $ workflow learn import patterns.yaml --format yaml  ${chalk.dim("# Import from YAML")}
`,
    )
    .action(learnImportCommand);

  // clean subcommand
  learnCmd
    .command("clean")
    .description("Clean old or stale learning patterns")
    .option("--deprecated", "Remove deprecated patterns")
    .option("--stale", "Remove patterns not used in 90+ days")
    .option("--all", "Remove all patterns (use with caution!)")
    .option("--dry-run", "Preview what would be removed")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn clean --deprecated                  ${chalk.dim("# Remove deprecated")}
  $ workflow learn clean --stale                       ${chalk.dim("# Remove stale patterns")}
  $ workflow learn clean --all --dry-run               ${chalk.dim("# Preview full clean")}
`,
    )
    .action(learnCleanCommand);

  // validate subcommand
  learnCmd
    .command("validate")
    .description("Validate pattern files and optionally auto-fix common issues")
    .option(
      "-t, --type <type>",
      "Pattern type to validate (fix, blueprint, solution, all)",
      "all",
    )
    .option("-f, --file <path>", "Validate a specific file by path")
    .option("--fix", "Automatically fix common issues")
    .option("-v, --verbose", "Show detailed validation output")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow learn validate                            ${chalk.dim("# Validate all patterns")}
  $ workflow learn validate --type fix                 ${chalk.dim("# Only fix patterns")}
  $ workflow learn validate --fix                      ${chalk.dim("# Auto-fix issues")}
  $ workflow learn validate -f ./patterns/auth.json   ${chalk.dim("# Validate specific file")}
  $ workflow learn validate --verbose                  ${chalk.dim("# Detailed output")}
`,
    )
    .action(learnValidateCommand);

  return learnCmd;
}

// Re-export individual commands for backward compatibility
export {
  learnRecordCommand,
  learnListCommand,
  learnApplyCommand,
  learnCaptureCommand,
  learnSyncCommand,
  learnConfigCommand,
  learnDeprecateCommand,
  learnPublishCommand,
  learnStatsCommand,
  learnValidateCommand,
  learnAnalyzeCommand,
  learnExportCommand,
  learnImportCommand,
  learnCleanCommand,
} from "../learn.js";
